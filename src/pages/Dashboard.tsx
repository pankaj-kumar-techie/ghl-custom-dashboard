import { useState, useEffect } from 'react';
import { Users, DollarSign, Briefcase, CalendarPlus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function Dashboard() {
    const { isDemoMode } = useAuth();
    const [stats, setStats] = useState({
        totalContacts: 0,
        totalOpportunities: 0,
        totalValue: 0,
        conversionRate: "0",
        appointments: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                if (isDemoMode) {
                    setTimeout(() => {
                        setStats({
                            totalContacts: 124,
                            totalOpportunities: 45,
                            totalValue: 12500,
                            conversionRate: "24.5",
                            appointments: []
                        });
                        setLoading(false);
                    }, 800);
                    return;
                }

                const { data, error } = await supabase.functions.invoke('ghl-proxy', {
                    body: { action: 'get_stats' }
                });

                if (error) throw error;
                if (data) {
                    setStats({
                        totalContacts: data.totalContacts || 0,
                        totalOpportunities: data.totalOpportunities || 0,
                        totalValue: data.totalValue || 0,
                        conversionRate: data.conversionRate || "0",
                        appointments: data.appointments || []
                    });
                }
            } catch (err: any) {
                console.error("Dashboard error:", err);
                setError("Failed to load dashboard statistics.");
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, [isDemoMode]);

    const statCards = [
        { name: 'Total Contacts', value: stats.totalContacts.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' },
        { name: 'Total Value', value: `$${stats.totalValue.toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
        { name: 'Opportunities', value: stats.totalOpportunities.toString(), icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/10' },
        { name: 'Win Rate', value: `${stats.conversionRate}%`, icon: CalendarPlus, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10' },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
            
            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-6 rounded-xl flex items-start gap-4 shadow-sm">
                    <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                        <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-900 dark:text-red-300">Connection Error</h3>
                        <p className="text-red-700 dark:text-red-400 mt-1">{error}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="mt-3 text-sm font-bold text-red-700 dark:text-red-400 underline hover:no-underline"
                        >
                            Retry Connection
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((item) => (
                    <div key={item.name} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-transform hover:-translate-y-1">
                        <div className="flex flex-col gap-3">
                            <div className={`w-fit p-3 rounded-lg ${item.bg}`}>
                                <item.icon className={`h-6 w-6 ${item.color}`} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{item.name}</p>
                                <p className="text-3xl font-extrabold text-gray-900 dark:text-white transition-all">
                                    {loading ? <span className="animate-pulse">...</span> : item.value}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-50 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white">Upcoming Pipeline</h3>
                </div>
                {loading ? (
                    <div className="p-6 space-y-4">
                        <div className="h-12 bg-gray-50 animate-pulse rounded" />
                        <div className="h-12 bg-gray-50 animate-pulse rounded" />
                    </div>
                ) : stats.appointments.length > 0 ? (
                    <div className="divide-y divide-gray-50 dark:divide-gray-700">
                        {stats.appointments.slice(0, 5).map((appt: any) => (
                            <div key={appt.id} className="p-6 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{appt.title}</p>
                                    <p className="text-xs text-gray-500">{new Date(appt.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                                </div>
                                <span className={`px-2 py-1 text-[10px] font-black uppercase rounded ${appt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {appt.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-400 text-sm">
                        No active calendar events found.
                    </div>
                )}
            </div>
        </div>
    );
}


