import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Briefcase, DollarSign, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export function Layout({ children }: { children: React.ReactNode }) {
    const { disconnect } = useAuth();
    const location = useLocation();

    // Navigation Items
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Calendar, label: 'Appointments', path: '/appointments' },
        { icon: Users, label: 'Leads', path: '/leads' },
        { icon: Briefcase, label: 'Opportunities', path: '/opportunities' },
        { icon: DollarSign, label: 'Orders', path: '/orders' },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
            {/* Top Navigation - Sticky for Iframe context */}
            <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-14 items-center">
                        {/* Nav Links */}
                        <div className="flex items-center overflow-x-auto no-scrollbar mask-gradient -ml-2">
                            <nav className="flex space-x-1 sm:space-x-2">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={cn(
                                                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap",
                                                isActive
                                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200 shadow-sm ring-1 ring-blue-200 dark:ring-blue-800"
                                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200"
                                            )}
                                        >
                                            <Icon className={cn("w-4 h-4 mr-2", isActive ? "text-blue-600 dark:text-blue-300" : "text-gray-400 group-hover:text-gray-500")} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Right Side Actions */}
                        <div className="flex items-center ml-4">
                            <button
                                onClick={disconnect}
                                title="Disconnect URL"
                                className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
                    {children}
                </div>
            </main>
        </div>
    );
}
