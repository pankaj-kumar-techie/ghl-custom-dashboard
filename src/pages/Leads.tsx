import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Users, 
  Search, 
  Calendar, 
  Download, 
  ChevronRight, 
  Mail, 
  Phone, 
  X,
  FileText,
  Clock,
  Filter,
  Briefcase
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Leads() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [apptsLoading, setApptsLoading] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [searchQuery]);

  const fetchLeads = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.functions.invoke('ghl-proxy', {
        body: {
          action: 'get_contacts',
          body: {
            query: searchQuery,
            limit: 50
          }
        }
      });
      if (error) throw error;
      setContacts(data.contacts || []);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError('Failed to load leads from HighLevel.');
    } finally {
      setLoading(false);
    }
  };

  const fetchContactAppointments = async (contactId: string) => {
    setApptsLoading(true);
    setAppointments([]);
    try {
      const { data, error } = await supabase.functions.invoke('ghl-proxy', {
        body: {
          action: 'get_contact_appointments',
          body: { contactId }
        }
      });
      if (error) throw error;
      setAppointments(data.events || []);
    } catch (err) {
      console.error('Error fetching contact appointments:', err);
    } finally {
      setApptsLoading(false);
    }
  };

  const handleContactClick = (contact: any) => {
    setSelectedContact(contact);
    fetchContactAppointments(contact.id);
  };

  const getResumeLink = (contact: any) => {
    // Custom field for Resume usually contains a URL
    const resumeField = contact.customFields?.find((f: any) => 
      f.id?.toLowerCase().includes('resume') || 
      f.name?.toLowerCase().includes('resume') ||
      (typeof f.value === 'string' && f.value.includes('http') && f.value.includes('resume'))
    );
    return resumeField?.value || null;
  };

  return (
    <div className="space-y-6 relative h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Lead Management</h2>
          <p className="text-gray-500 dark:text-gray-400">View and manage your HighLevel contacts.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={fetchLeads}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <Filter className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded-r-lg">
          <div className="flex items-center">
            <X className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Added</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Resume</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Loading leads...</td>
                </tr>
              )}
              {!loading && contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No leads found.</td>
                </tr>
              )}
              {contacts.map((contact) => (
                <tr 
                  key={contact.id} 
                  className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors ${selectedContact?.id === contact.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  onClick={() => handleContactClick(contact)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold mr-3 shadow-sm border border-blue-200 dark:border-blue-800">
                        {contact.firstName ? contact.firstName[0] : <Users className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {contact.firstName || ''} {contact.lastName || ''}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{contact.type || 'Lead'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <Mail className="w-3.5 h-3.5 mr-2 text-gray-400" />
                        {contact.email || 'No email'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <Phone className="w-3.5 h-3.5 mr-2 text-gray-400" />
                        {contact.phone || 'No phone'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {contact.dateAdded ? format(new Date(contact.dateAdded), 'MMM d, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {getResumeLink(contact) ? (
                      <a 
                        href={getResumeLink(contact)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded border border-blue-100 dark:border-blue-800 w-fit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Resume
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <ChevronRight className={`w-5 h-5 text-gray-300 transition-transform ${selectedContact?.id === contact.id ? 'rotate-90 text-blue-500' : ''}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Detail Panel */}
      {selectedContact && (
        <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 border-l border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out">
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Lead Details</h3>
              <button 
                onClick={() => setSelectedContact(null)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Profile Overview */}
              <div className="text-center">
                <div className="w-20 s-20 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-3xl font-bold mb-4 shadow-md border-2 border-white dark:border-gray-800">
                  {selectedContact.firstName ? selectedContact.firstName[0] : <Users className="w-10 h-10" />}
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedContact.firstName} {selectedContact.lastName}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">ID: {selectedContact.id}</p>
              </div>

              {/* Contact Specific Info */}
              <div className="space-y-4 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center text-sm">
                  <Mail className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-900 dark:text-gray-200">{selectedContact.email || 'N/A'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Phone className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-900 dark:text-gray-200">{selectedContact.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-900 dark:text-gray-200 font-medium">Added: </span>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    {selectedContact.dateAdded ? format(new Date(selectedContact.dateAdded), 'PPP') : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Appointments Section */}
              <div className="space-y-4">
                <h5 className="font-bold text-gray-900 dark:text-white flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                  Recent Appointments
                </h5>
                
                {apptsLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
                    <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                ) : appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.map((appt: any) => (
                      <div key={appt.id} className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">{appt.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
                          <span>{format(new Date(appt.startTime), 'MMM d, h:mm a')}</span>
                          <span className="text-blue-500 font-medium capitalize">{appt.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">No appointments found.</p>
                  </div>
                )}
              </div>

              {/* Custom Fields (Optional Diagnostic) */}
              <div className="space-y-4">
                <h5 className="font-bold text-gray-900 dark:text-white flex items-center">
                  <Briefcase className="w-4 h-4 mr-2 text-blue-500" />
                  Custom Fields
                </h5>
                <div className="grid grid-cols-1 gap-2">
                  {selectedContact.customFields?.length > 0 ? (
                    selectedContact.customFields.map((field: any, idx: number) => (
                      <div key={idx} className="flex flex-col p-2 bg-gray-50 dark:bg-gray-900/20 rounded border border-gray-100 dark:border-gray-700">
                        <span className="text-[10px] text-gray-400 truncate uppercase">{field.name || field.id}</span>
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{String(field.value)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic text-center py-4">No custom fields found.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                disabled={!getResumeLink(selectedContact)}
              >
                {getResumeLink(selectedContact) ? (
                  <a 
                    href={getResumeLink(selectedContact)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Resume
                  </a>
                ) : (
                  <span className="flex items-center justify-center">
                    <FileText className="w-5 h-5 mr-2 text-white/50" />
                    No Resume Available
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
