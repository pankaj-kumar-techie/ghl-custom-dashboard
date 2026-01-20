import { useState, useEffect } from 'react';
import { Users, Calendar, DollarSign, Briefcase, Plus, CalendarPlus, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Dashboard() {
    const { isDemoMode } = useAuth();
    const [stats, setStats] = useState({
        totalContacts: 0,
        upcomingAppointments: 0,
        pipelineValue: 0,
        openOpportunities: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                if (isDemoMode) {
                    // Mock Data for Demo Mode
                    setTimeout(() => {
                        setStats({
                            totalContacts: 124,
                            upcomingAppointments: 8,
                            pipelineValue: 45000,
                            openOpportunities: 12
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
                        upcomingAppointments: data.upcomingAppointments || 0,
                        pipelineValue: data.pipelineValue || 0,
                        openOpportunities: data.openOpportunities || 0
                    });
                }
            } catch (err) {
                console.error("Failed to load dashboard stats", err);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, [isDemoMode]);

    const statCards = [
        { name: 'Total Leads', value: stats.totalContacts.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
        { name: 'Appointments', value: stats.upcomingAppointments.toString(), icon: Calendar, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
        { name: 'Pipeline Value', value: `$${stats.pipelineValue.toLocaleString()}`, icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/20' },
        { name: 'Open Opportunities', value: stats.openOpportunities.toString(), icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Dashboard Overview {isDemoMode && <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">Demo Mode</span>}
                </h2>
                <div className="flex space-x-3">
                    <Link to="/appointments" className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md shadow transition-colors">
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        Book Appointment
                    </Link>
                    <button className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-md shadow-sm transition-colors">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Lead
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.name} className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 p-6 transition-all hover:shadow-md">
                            <div className="flex items-center">
                                <div className={`flex-shrink-0 p-3 rounded-lg ${item.bg}`}>
                                    <Icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{item.name}</dt>
                                        <dd>
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                                {loading ? "..." : item.value}
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Connection Status / Activity */}
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Recent Activity
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-start pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                            <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-full mr-3">
                                <Users className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">New Lead Created</p>
                                <p className="text-xs text-gray-500">2 hours ago</p>
                            </div>
                        </div>
                        <div className="flex items-start pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                            <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full mr-3">
                                <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Appointment Scheduled</p>
                                <p className="text-xs text-gray-500">5 hours ago</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-center items-center text-center">
                    <div className={`p-4 rounded-full ${isDemoMode ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'bg-green-50 dark:bg-green-900/10'} mb-3`}>
                        <div className={`w-3 h-3 rounded-full ${isDemoMode ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">System Status</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {isDemoMode ? "Running in Demo Mode (Mock Data)" : (loading ? "Checking connection..." : "Connected to HighLevel & Syncing")}
                    </p>
                </div>
            </div>
        </div>
    );
}
