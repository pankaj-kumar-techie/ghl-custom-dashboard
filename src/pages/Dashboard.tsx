import { Users, Calendar, DollarSign, Briefcase } from 'lucide-react';

const stats = [
    { name: 'Total Leads', value: '2,847', icon: Users, change: '+12.5%', changeType: 'positive' },
    { name: 'Appointments', value: '45', icon: Calendar, change: '+2.1%', changeType: 'positive' },
    { name: 'Revenue', value: '$4,200', icon: DollarSign, change: '+8.4%', changeType: 'positive' },
    { name: 'Opportunities', value: '18', icon: Briefcase, change: '-1.2%', changeType: 'negative' },
];

export function Dashboard() {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h2>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.name} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900 dark:text-white">{item.value}</div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className={`text-sm ${item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.change} since last month
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                <div className="border-t border-gray-200 dark:border-gray-700 py-4">
                    <p className="text-gray-500 dark:text-gray-400">Loading recent activity...</p>
                </div>
            </div>
        </div>
    );
}
