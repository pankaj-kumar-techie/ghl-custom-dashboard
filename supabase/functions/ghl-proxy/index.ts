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
                console.log("Token expired, refreshing...");
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
                if (!refreshRes.ok) throw new Error("Token refresh failed");

                // Update DB and local variable
                accessToken = refreshData.access_token;
                tokens.refresh_token = refreshData.refresh_token;
                await supabase.from("ghl_tokens").update({
                    access_token: refreshData.access_token,
                    refresh_token: refreshData.refresh_token,
                    expires_in: refreshData.expires_in,
                    updated_at: new Date().toISOString(),
                }).eq("id", tokens.id);

                // Retry
                res = await makeRequest(accessToken);
            }

            return res; // Return the response object, let caller handle json()
        };

        // --- Handle specific Actions ---
        if (action === "get_stats") {
            // Parallel fetch for dashboard stats
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

            const [contactsRes, oppsRes, apptsRes] = await Promise.all([
                // 1. Total Contacts (just need meta)
                fetchGHL(`${GHL_API_BASE}/contacts/?locationId=${locationId}&limit=1`),

                // 2. Opportunities (for Revenue & Count) - fetching 100 recent
                fetchGHL(`${GHL_API_BASE}/opportunities/search?locationId=${locationId}&limit=100&status=open`),

                // 3. Appointments (This Month)
                fetchGHL(`${GHL_API_BASE}/calendars/events?locationId=${locationId}&startTime=${Date.now()}&endTime=${Date.now() + 2592000000}`) // next 30 days roughly
            ]);

            const contactsData = await contactsRes.json();
            const oppsData = await oppsRes.json();
            const apptsData = await apptsRes.json();

            // Calculate Metrics
            const totalContacts = contactsData.meta?.total || 0;

            const opportunities = oppsData.opportunities || [];
            const openOpportunities = opportunities.length;
            const totalValue = opportunities.reduce((sum: number, opp: any) => sum + (Number(opp.monetaryValue) || 0), 0);

            const events = apptsData.events || [];
            const upcomingAppointments = events.length;

            return new Response(JSON.stringify({
                totalContacts,
                openOpportunities,
                pipelineValue: totalValue,
                upcomingAppointments
            }), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });

            // --- Handle Generic Proxy ---
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

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    }
});
