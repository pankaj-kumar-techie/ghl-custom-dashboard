import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const GHL_TOKEN_URL = "https://services.leadconnectorhq.com/oauth/token";

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
        const url = new URL(req.url);
        let code = url.searchParams.get("code");

        if (!code && req.body) {
            try {
                const bodyJson = await req.json();
                code = bodyJson.code;
            } catch (e) {
                // ignore error if body is not json
            }
        }

        if (!code) {
            return new Response(JSON.stringify({ error: "No code provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const clientId = Deno.env.get("GHL_CLIENT_ID");
        const clientSecret = Deno.env.get("GHL_CLIENT_SECRET");
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
            throw new Error("Missing environment variables");
        }

        // Exchange code for token
        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: Deno.env.get("GHL_REDIRECT_URI") || "", // e.g. https://<project>.supabase.co/functions/v1/ghl-oauth is unlikely, usually frontend handles redirect, then calls this with code? 
            // Actually, usually frontend gets the code, then calls THIS function to exchange it.
            // Let's assume frontend calls this function passing the code.
        });

        console.log("Exchanging code for token...");
        const tokenRes = await fetch(GHL_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            console.error("Token exchange failed:", tokenData);
            return new Response(JSON.stringify(tokenData), {
                status: tokenRes.status,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Store in Supabase
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error: dbError } = await supabase.from("ghl_tokens").upsert(
            {
                location_id: tokenData.locationId,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                user_type: tokenData.userType,
                company_id: tokenData.companyId,
                expires_in: tokenData.expires_in,
                scope: tokenData.scope,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "location_id" }
        );

        if (dbError) {
            console.error("DB Error:", dbError);
            throw dbError;
        }

        // Return success to frontend
        return new Response(JSON.stringify({ success: true, locationId: tokenData.locationId }), {
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
