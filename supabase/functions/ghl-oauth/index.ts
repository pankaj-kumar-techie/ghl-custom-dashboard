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

        const clientId = Deno.env.get("GHL_CLIENT_ID")?.trim();
        const clientSecret = Deno.env.get("GHL_CLIENT_SECRET")?.trim();
        const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
        const redirectUri = Deno.env.get("GHL_REDIRECT_URI")?.trim();

        if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
            console.error("Missing environment variables:", {
                hasClientId: !!clientId,
                hasClientSecret: !!clientSecret,
                hasSupabaseUrl: !!supabaseUrl,
                hasSupabaseKey: !!supabaseKey
            });
            throw new Error("Missing environment variables in Supabase");
        }

        console.log("Exchanging code for token with:", {
            clientId: clientId,
            redirectUri: redirectUri,
            codeLength: code?.length,
            // Log first and last 3 chars of secret for verification without exposing it fully
            secretSnippet: `${clientSecret.substring(0, 3)}...${clientSecret.substring(clientSecret.length - 3)}`
        });

        // Exchange code for token
        const tokenParams = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirectUri || "",
        });

        const tokenRes = await fetch(GHL_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: tokenParams.toString(),
        });

        const contentType = tokenRes.headers.get("content-type");
        let tokenData;
        if (contentType && contentType.includes("application/json")) {
            tokenData = await tokenRes.json();
        } else {
            tokenData = { error: "Non-JSON response", raw: await tokenRes.text() };
        }

        if (!tokenRes.ok) {
            console.error("GHL Token Exchange Failed:", {
                status: tokenRes.status,
                data: tokenData,
                sentParams: {
                    clientId,
                    redirectUri,
                    codeLength: code?.length
                }
            });
            return new Response(JSON.stringify({ 
                error: "Token exchange failed", 
                details: tokenData,
                status: tokenRes.status 
            }), {
                status: tokenRes.status,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
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

    } catch (error: any) {
        console.error("Critical Function Error:", error);
        return new Response(JSON.stringify({ 
            error: error.message,
            stack: error.stack 
        }), {
            status: 500,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    }
});
