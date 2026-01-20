import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

serve(async (req) => {
    // CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        const { endpoint, method = "GET", body } = await req.json();

        if (!endpoint) {
            return new Response(JSON.stringify({ error: "No endpoint provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Missing environment variables");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch the stored token
        // In a real app we'd need to know WHICH location/user. 
        // For single tenant, just get the first one or latest updated.
        const { data: tokens, error: tokenError } = await supabase
            .from("ghl_tokens")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();

        if (tokenError || !tokens) {
            return new Response(JSON.stringify({ error: "No connected GHL account found" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        let accessToken = tokens.access_token;

        // Check if we need to refresh (simple check, assume expires_in is seconds)
        // Actually we should store 'expires_at' calc. 
        // efficient way: just try call, if 401, refresh. 
        // Or if we know it's old (updated_at + expires_in < now).
        // For simplicity: Try call, if 401, refresh and retry.

        let response = await fetch(`${GHL_API_BASE}${endpoint}`, {
            method,
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Version": "2021-07-28",
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (response.status === 401) {
            console.log("Token expired, refreshing...");
            // Refresh flow
            const refreshRes = await fetch("https://services.leadconnectorhq.com/oauth/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: Deno.env.get("GHL_CLIENT_ID") || "",
                    client_secret: Deno.env.get("GHL_CLIENT_SECRET") || "",
                    grant_type: "refresh_token",
                    refresh_token: tokens.refresh_token,
                }).toString(),
            });

            const refreshData = await refreshRes.json();

            if (!refreshRes.ok) {
                console.error("Refresh failed:", refreshData);
                return new Response(JSON.stringify({ error: "Token refresh failed. Please reconnect." }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Update DB
            accessToken = refreshData.access_token;
            await supabase.from("ghl_tokens").update({
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token,
                expires_in: refreshData.expires_in, // seconds
                updated_at: new Date().toISOString(),
            }).eq("id", tokens.id);

            // Retry original request
            response = await fetch(`${GHL_API_BASE}${endpoint}`, {
                method,
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Version": "2021-07-28",
                    "Content-Type": "application/json",
                },
                body: body ? JSON.stringify(body) : undefined,
            });
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
