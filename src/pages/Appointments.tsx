import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Filter, Users as UsersIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Appointments() {
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [dateFilter]);

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      // GHL API 2.0 endpoint for appointments
      const startTime = new Date(dateFilter).getTime();
      const endTime = startTime + 86400000; // +1 day

      const { data, error } = await supabase.functions.invoke('ghl-proxy', {
        body: {
          endpoint: `/calendars/events?startTime=${startTime}&endTime=${endTime}`,
          method: 'GET'
        }
      });

      if (error) throw error;
      setAppointments(data.events || []);
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError('Failed to load appointments. Please ensure you are connected.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Appointments</h2>
        <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <CalendarIcon className="w-4 h-4 text-gray-500" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            {loading ? 'Loading...' : 'Upcoming Appointments'}
          </h3>
          <button
            onClick={fetchAppointments}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Filter className="w-4 h-4 mr-1" />
            Refresh
          </button>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {!loading && appointments.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">No appointments found for this date.</li>
          )}
          {appointments.map((appt) => (
            <li key={appt.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-blue-600 truncate">
                  {appt.title || 'Untitled Appointment'}
                </div>
                <div className="ml-2 flex-shrink-0 flex">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${appt.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {appt.status || 'Scheduled'}
                  </span>
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <UsersIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    {appt.contactId || 'Unknown Contact'}
                  </p>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 dark:text-gray-400">
                  <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  <p>{new Date(appt.startTime).toLocaleString()}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
