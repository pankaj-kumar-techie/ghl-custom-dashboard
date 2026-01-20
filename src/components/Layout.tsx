import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Briefcase, DollarSign, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export function Layout({ children }: { children: React.ReactNode }) {
    const { disconnect } = useAuth();
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Calendar, label: 'Appointments', path: '/appointments' },
        { icon: Users, label: 'Leads', path: '/leads' },
        { icon: Briefcase, label: 'Opportunities', path: '/opportunities' },
        { icon: DollarSign, label: 'Orders', path: '/orders' },
    ];

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
            {/* Top Navigation for GHL Iframe context */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                {/* Optional: Show branding or hide if in GHL */}
                                <span className="font-bold text-xl text-primary">GHL App</span>
                            </div>
                            <nav className="ml-6 flex items-center space-x-4">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={cn(
                                                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            )}
                                        >
                                            <Icon className="w-4 h-4 mr-2" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={disconnect}
                                className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Disconnect
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
