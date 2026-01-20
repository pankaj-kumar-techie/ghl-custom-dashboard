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

        // --- Action Dispatcher ---
        let result;

        switch (action) {
            case "get_stats": {
                const businessId = token.company_id;
                const isBusinessToken = token.user_type === 'Company' || token.user_type === 'Agency';
                
                const contactsUrl = isBusinessToken && businessId
                    ? `${GHL_API_BASE}/contacts/business/${businessId}?locationId=${locationId}&limit=1`
                    : `${GHL_API_BASE}/contacts/?locationId=${locationId}&limit=1`;

                const [contactsRes, oppsRes, apptsRes] = await Promise.all([
                    fetchGHL(contactsUrl),
                    fetchGHL(`${GHL_API_BASE}/opportunities/search?locationId=${locationId}&limit=100`),
                    fetchGHL(`${GHL_API_BASE}/calendars/events?locationId=${locationId}&startTime=${Date.now() - (180 * 24 * 60 * 60 * 1000)}&endTime=${Date.now() + (180 * 24 * 60 * 60 * 1000)}`)
                ]);

                const contactsData = await contactsRes.json();
                const oppsData = await oppsRes.json();
                const apptsData = await apptsRes.json();

                const opportunities = oppsData.opportunities || [];
                const totalValue = opportunities.reduce((sum: number, opp: any) => sum + (Number(opp.monetaryValue) || 0), 0);
                const wonOpps = opportunities.filter((opp: any) => opp.status === 'won');
                const conversionRate = opportunities.length > 0 ? (wonOpps.length / opportunities.length) * 100 : 0;

                result = {
                    totalContacts: (isBusinessToken && businessId) ? (contactsData.count || 0) : (contactsData.meta?.total || contactsData.total || 0),
                    totalOpportunities: opportunities.length,
                    totalValue,
                    conversionRate: conversionRate.toFixed(1),
                    recentContacts: (contactsData.contacts || []).slice(0, 10),
                    pipelineData: opportunities,
                    appointments: apptsData.events || []
                };
                break;
            }

            case "get_contacts": {
                const businessId = token.company_id;
                const isBusinessToken = token.user_type === 'Company' || token.user_type === 'Agency';
                
                const { limit = 20, query, useBusinessWide = true, startAfter, startAfterId } = body || {};
                
                const params = new URLSearchParams();
                params.append("limit", String(limit));
                
                // GHL V2 Contacts API uses cursor-based pagination
                if (startAfter) params.append("startAfter", String(startAfter));
                if (startAfterId) params.append("startAfterId", String(startAfterId));

                if (!(isBusinessToken && businessId && useBusinessWide)) {
                    params.append("locationId", locationId);
                }
                
                if (query) params.append("query", query);

                const url = isBusinessToken && businessId && useBusinessWide
                    ? `${GHL_API_BASE}/contacts/business/${businessId}?${params.toString()}`
                    : `${GHL_API_BASE}/contacts/?${params.toString()}`;
                
                console.log(`Fetching Contacts (${token.user_type}): ${url}`);
                
                const res = await fetchGHL(url, { method: "GET" });
                
                let data;
                try {
                    data = await res.json();
                } catch (e) {
                    throw new Error(`GHL returned non-JSON response (Status: ${res.status})`);
                }

                if (!res.ok) {
                    throw new Error(data.message || `GHL API Error: ${res.status}`);
                }
                
                }
                
                result = data;
                break;
            }

            case "get_contact_appointments": {
                const { contactId } = body || {};
                if (!contactId) throw new Error("contactId is required");
                const res = await fetchGHL(`${GHL_API_BASE}/contacts/${contactId}/appointments`);
                result = await res.json();
                break;
            }

            case "get_contact_detail": {
                const { contactId } = body || {};
                if (!contactId) throw new Error("contactId is required");
                const res = await fetchGHL(`${GHL_API_BASE}/contacts/${contactId}`);
                result = await res.json();
                break;
            }

            case "get_custom_fields": {
                const res = await fetchGHL(`${GHL_API_BASE}/locations/${locationId}/customFields`);
                result = await res.json();
                break;
            }

            case "test_connection": {
                const res = await fetchGHL(`${GHL_API_BASE}/locations/${locationId}`);
                const data = await res.json();
                if (res.ok) {
                    result = { success: true, location: data };
                } else {
                    throw new Error(data.message || "Connection failed");
                }
                break;
            }

            default: {
                if (endpoint) {
                    const res = await fetchGHL(`${GHL_API_BASE}${endpoint}`, {
                        method,
                        body: body ? JSON.stringify(body) : undefined
                    });
                    result = await res.json();
                    return new Response(JSON.stringify(result), {
                        status: res.status,
                        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
                    });
                }
                throw new Error(`Unknown action: ${action}`);
            }
        }

        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    }
});
