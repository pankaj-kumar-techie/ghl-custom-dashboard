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
        const { endpoint, method = "GET", body, action } = await req.json();

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Missing environment variables");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch the stored token (Get latest connected account)
        const { data: tokens, error: tokenError } = await supabase
            .from("ghl_tokens")
            .select("*")
            .order("updated_at", { ascending: false })
            .limit(1);

        const token = tokens && tokens.length > 0 ? tokens[0] : null;

        if (tokenError || !token) {
            console.error("No connected GHL account found in DB:", tokenError);
            return new Response(JSON.stringify({ 
                error: "No connected GHL account found",
                details: tokenError 
            }), {
                status: 401,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
        }

        let accessToken = token.access_token;
        const locationId = token.location_id;

        // Helper to make authenticated requests with auto-refresh
        const fetchGHL = async (url: string, options: any = {}): Promise<any> => {
            const makeRequest = async (token: string) => {
                return fetch(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        "Authorization": `Bearer ${token}`,
                        "Version": "2021-07-28",
                        "Content-Type": "application/json",
                    },
                });
            };

            let res = await makeRequest(accessToken);

            if (res.status === 401) {
                console.log("Token expired (401), attempting to refresh...");
                
                const clientId = (Deno.env.get("GHL_CLIENT_ID") || "").trim();
                const clientSecret = (Deno.env.get("GHL_CLIENT_SECRET") || "").trim();

                const refreshRes = await fetch("https://services.leadconnectorhq.com/oauth/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        grant_type: "refresh_token",
                        refresh_token: token.refresh_token,
                    }).toString(),
                });

                const refreshData = await refreshRes.json();
                
                if (!refreshRes.ok) {
                    console.error("GHL Token Refresh Failed:", {
                        status: refreshRes.status,
                        error: refreshData,
                        message: refreshData.error_description || refreshData.error
                    });
                    throw new Error(`Token refresh failed: ${refreshData.error_description || refreshData.error || 'Unknown error'}`);
                }

                console.log("Token refreshed successfully.");

                // Update DB and local variable
                accessToken = refreshData.access_token;
                token.refresh_token = refreshData.refresh_token;
                await supabase.from("ghl_tokens").update({
                    access_token: refreshData.access_token,
                    refresh_token: refreshData.refresh_token,
                    expires_in: refreshData.expires_in,
                    updated_at: new Date().toISOString(),
                }).eq("id", token.id);

                // Retry
                res = await makeRequest(accessToken);
            }

            return res; // Return the response object, let caller handle json()
        };

        // --- Handle specific Actions ---
        if (action === "get_stats") {
            // ... existing get_stats logic ...
            const [contactsRes, oppsRes, apptsRes] = await Promise.all([
                fetchGHL(`${GHL_API_BASE}/contacts/?locationId=${locationId}&limit=1`),
                fetchGHL(`${GHL_API_BASE}/opportunities/search?locationId=${locationId}&limit=100&status=open`),
                fetchGHL(`${GHL_API_BASE}/calendars/events?locationId=${locationId}&startTime=${Date.now()}&endTime=${Date.now() + 2592000000}`)
            ]);

            const contactsData = await contactsRes.json();
            const oppsData = await oppsRes.json();
            const apptsData = await apptsRes.json();

            return new Response(JSON.stringify({
                totalContacts: contactsData.meta?.total || 0,
                openOpportunities: (oppsData.opportunities || []).length,
                pipelineValue: (oppsData.opportunities || []).reduce((sum: number, opp: any) => sum + (Number(opp.monetaryValue) || 0), 0),
                upcomingAppointments: (apptsData.events || []).length
            }), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });

        } else if (action === "get_contacts") {
            const { limit = 20, offset = 0, query } = body || {};
            let url = `${GHL_API_BASE}/contacts/?locationId=${locationId}&limit=${limit}&offset=${offset}`;
            if (query) url += `&query=${encodeURIComponent(query)}`;
            
            const response = await fetchGHL(url);
            const data = await response.json();
            return new Response(JSON.stringify(data), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });

        } else if (action === "get_contact_appointments") {
            const { contactId } = body || {};
            if (!contactId) throw new Error("contactId is required");
            
            const url = `${GHL_API_BASE}/calendars/events?locationId=${locationId}&contactId=${contactId}`;
            const response = await fetchGHL(url);
            const data = await response.json();
            return new Response(JSON.stringify(data), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });

        } else if (endpoint) {
            const response = await fetchGHL(`${GHL_API_BASE}${endpoint}`, {
                method,
                body: body ? JSON.stringify(body) : undefined
            });
            const data = await response.json();
            return new Response(JSON.stringify(data), {
                status: response.status,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
        }

        return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    }
});
