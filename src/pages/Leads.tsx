import { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { Search, Users, FileText, RefreshCw, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Leads() {
  // Master Data
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  
  // App State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCV, setFilterCV] = useState<'all' | 'has' | 'none'>('all');
  const [filterSession, setFilterSession] = useState<'all' | 'has' | 'none'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  
  // Sync Status
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalValue: 0,
    conversionRate: "0"
  });

  // 1. Initial Load & Background Sync Engine
  const syncLock = useRef(false);

  useEffect(() => {
    if (syncLock.current) return;
    syncLock.current = true;

    const controller = new AbortController();
    const signal = controller.signal;
    
    const startSync = async () => {
      setSyncing(true);
      setError('');
      
      try {
        setAllContacts([]); // Reset for fresh sync
        
        console.log('Starting Initial Load (Stats & Fields)...');
        // Initial Fetch for Stats, Fields, and Batch 1
        const [statsRes, fieldsRes] = await Promise.all([
          supabase.functions.invoke('ghl-proxy', { 
            body: { action: 'get_stats' }
          }),
          supabase.functions.invoke('ghl-proxy', { 
            body: { action: 'get_custom_fields' }
          })
        ]);

        if (statsRes.error) {
          if (signal.aborted) return;
          console.error('Stats Fetch Error Detail:', {
            error: statsRes.error,
            message: statsRes.error.message,
            name: statsRes.error.name
          });
          throw new Error(`Failed to fetch dashboard stats: ${statsRes.error.message}`);
        }
        if (fieldsRes.error) {
          console.error('Fields Fetch Error:', fieldsRes.error);
          // Non-critical, but log it
        }

        if (statsRes.data) {
          console.log('Stats received:', statsRes.data);
          setAllAppointments(statsRes.data.appointments || []);
          setStats({
            totalValue: statsRes.data.totalValue || 0,
            conversionRate: statsRes.data.conversionRate || "0"
          });
          const totalRecords = statsRes.data.totalContacts || 0;
          setSyncProgress({ current: 0, total: totalRecords });
        }
        
        if (fieldsRes.data) {
          console.log('Custom fields received:', fieldsRes.data.customFields?.length || 0);
          setCustomFields(fieldsRes.data.customFields || []);
        }

        // Recursive Batch Fetching (100 per batch)
        let totalCount = 0;
        let lastStartAfter: any = null;
        let lastStartAfterId: any = null;
        const limit = 100;

        const fetchBatch = async (sAfter?: any, sAfterId?: any, retryCount = 0): Promise<any> => {
          if (controller.signal.aborted) return { batchSize: 0 };

          try {
            const { data, error } = await supabase.functions.invoke('ghl-proxy', { 
              body: { 
                action: 'get_contacts', 
                body: { 
                  limit, 
                  startAfter: sAfter, 
                  startAfterId: sAfterId 
                } 
              }
            });

            if (error) throw error;
            
            const batch = data?.contacts || [];
            const count = data?.count || data?.meta?.total || totalCount;
            totalCount = count;

            console.log(`Batch received: ${batch.length} contacts. Total in system: ${totalCount}`);
            
            const nextStartAfter = data?.meta?.startAfter;
            const nextStartAfterId = data?.meta?.startAfterId;
            
            setAllContacts(prev => {
                console.log(`Updating local state. Previous: ${prev.length}, New: ${batch.length}`);
                const contactMap = new Map(prev.map(c => [c.id, c]));
                batch.forEach((c: any) => contactMap.set(c.id, c));
                return Array.from(contactMap.values());
            });
            
            setSyncProgress(prev => ({ 
              current: Math.min(prev.current + batch.length, totalCount), 
              total: totalCount 
            }));
            
            return { batchSize: batch.length, nextStartAfter, nextStartAfterId };
          } catch (err: any) {
            if (err.name === 'AbortError') return { batchSize: 0 };
            
            // Exponential Backoff for Rate Limits or Temporary Failures
            if (retryCount < 3) {
              const delay = Math.pow(2, retryCount) * 1000;
              console.warn(`Sync retry ${retryCount + 1} after ${delay}ms...`);
              await new Promise(r => setTimeout(r, delay));
              return fetchBatch(sAfter, sAfterId, retryCount + 1);
            }
            throw err;
          }
        };

        // First batch
        console.log('Fetching first contact batch...');
        const first = await fetchBatch();
        lastStartAfter = first.nextStartAfter;
        lastStartAfterId = first.nextStartAfterId;
        console.log('First batch complete. Next cursor:', { lastStartAfter, lastStartAfterId });

        // Continue sync loop until all records are fetched
        while (lastStartAfterId && lastStartAfter && !controller.signal.aborted) {
           const result = await fetchBatch(lastStartAfter, lastStartAfterId);
           if (result.batchSize === 0) break;
           
           lastStartAfter = result.nextStartAfter;
           lastStartAfterId = result.nextStartAfterId;
           
           // Standard throttle: 100ms between successful batches
           await new Promise(r => setTimeout(r, 100));
        }

      } catch (err: any) {
        if (signal.aborted || err.name === 'AbortError') return;
        console.error('Local Intelligence Sync Error:', err);
        setError('Sync interrupted. Data may be partial.');
      } finally {
        if (!signal.aborted) {
          setSyncing(false);
        }
        // If aborted, we might want to allow a future sync? 
        // In strict mode, we actually want the first one to just die and let the second one run?
        // Wait, the guard prevents the second one.
        if (signal.aborted) {
          syncLock.current = false;
        }
      }
    };

    startSync();
    return () => {
      controller.abort();
    };
  }, []);

  // 2. Local Intelligence: Search, Filter, Sort
  const findResumeValue = (contact: any) => {
    const resumeFieldDef = customFields.find((f: any) => f.name?.toLowerCase().includes('resume'));
    if (resumeFieldDef) {
       const val = contact.customFields?.find((f: any) => f.id === resumeFieldDef.id || f.id === resumeFieldDef.fieldKey)?.value;
       if (val) return val;
    }
    const possibleResume = contact.customFields?.find((f: any) => 
      typeof f.value === 'string' && (f.value.includes('http') && (f.value.includes('resume') || f.value.includes('.pdf')))
    );
    return possibleResume?.value || null;
  };

  const filteredAndSortedContacts = useMemo(() => {
    let result = allContacts.filter(contact => {
      // Global Search
      const searchTerms = searchQuery.toLowerCase();
      const nameMatch = `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerms);
      const emailMatch = contact.email?.toLowerCase().includes(searchTerms);
      const phoneMatch = contact.phone?.includes(searchTerms);
      const sourceMatch = contact.source?.toLowerCase().includes(searchTerms);
      
      if (searchQuery && !(nameMatch || emailMatch || phoneMatch || sourceMatch)) return false;

      // CV Filter
      const hasCV = !!findResumeValue(contact);
      if (filterCV === 'has' && !hasCV) return false;
      if (filterCV === 'none' && hasCV) return false;

      // Session Filter
      const hasSession = allAppointments.some(a => a.contactId === contact.id || a.email === contact.email);
      if (filterSession === 'has' && !hasSession) return false;
      if (filterSession === 'none' && hasSession) return false;

      return true;
    });

    // Local Sort
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        let aVal = a[key] || '';
        let bVal = b[key] || '';
        if (key === 'name') {
          aVal = `${a.firstName} ${a.lastName}`;
          bVal = `${b.firstName} ${b.lastName}`;
        }
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [allContacts, searchQuery, filterCV, filterSession, sortConfig, allAppointments, customFields]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const syncContactDeep = async (contactId: string) => {
    setRefreshingId(contactId);
    try {
      const { data, error } = await supabase.functions.invoke('ghl-proxy', {
        body: { action: 'get_contact_detail', body: { contactId } },
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }
      });
      if (error) throw error;
      if (data?.contact) {
        setAllContacts(prev => prev.map(c => c.id === contactId ? { ...c, ...data.contact } : c));
      }
    } catch (err) {
      console.error('Deep Sync Error:', err);
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-6 pb-24 animate-in fade-in duration-700 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="relative flex-1 group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Instant search across all records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-4 py-3 bg-transparent border-none text-sm font-bold text-slate-900 dark:text-white w-full focus:ring-0 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 px-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Market Status:</span>
              <select 
                value={filterCV} 
                onChange={(e) => setFilterCV(e.target.value as any)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="all">Any Document</option>
                <option value="has">CV Secured</option>
                <option value="none">Pending File</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Availability:</span>
              <select 
                value={filterSession} 
                onChange={(e) => setFilterSession(e.target.value as any)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-xs font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="all">All Sessions</option>
                <option value="has">Booked</option>
                <option value="none">Open Access</option>
              </select>
            </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 rounded-2xl flex items-center justify-between gap-4">
           <div className="flex items-center gap-3 text-rose-600 font-bold text-xs uppercase tracking-widest">
             <Layers className="w-4 h-4" />
             {error}
           </div>
           <button onClick={() => window.location.reload()} className="text-[10px] font-bold text-rose-500 hover:underline">Retry Connection</button>
        </div>
      )}

      {/* 2. Flat Data Grid */}
      <div className="overflow-x-auto px-4 relative">
        {/* Subtle Timeline Axis */}
        <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-slate-100 dark:bg-slate-800 pointer-events-none z-0" />
        
        <table className="w-full text-left border-collapse min-w-[1000px] relative z-10">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className="py-6 font-black text-slate-400 uppercase text-[9px] tracking-[0.3em] w-16">#</th>
              <th onClick={() => requestSort('name')} className="py-6 font-black text-slate-400 uppercase text-[9px] tracking-[0.3em] cursor-pointer group hover:text-blue-600 transition-colors">
                <div className="flex items-center gap-2">
                  Identity
                  <span className={cn("transition-all duration-300 opacity-0 text-blue-600", sortConfig?.key === 'name' && "opacity-100")}>
                    {sortConfig?.direction === 'asc' ? '↓' : '↑'}
                  </span>
                </div>
              </th>
              <th className="py-6 font-black text-slate-400 uppercase text-[9px] tracking-[0.3em]">Channel</th>
              <th className="py-6 font-black text-slate-400 uppercase text-[9px] tracking-[0.3em]">Activity</th>
              <th className="py-6 font-black text-slate-400 uppercase text-[9px] tracking-[0.3em] text-center w-32">Actions</th>
              <th onClick={() => requestSort('dateAdded')} className="py-6 font-black text-slate-400 uppercase text-[9px] tracking-[0.3em] text-right cursor-pointer group hover:text-blue-600 transition-colors">
                <div className="flex items-center justify-end gap-2">
                  Staged
                  <span className={cn("transition-all duration-300 opacity-0 text-blue-600", sortConfig?.key === 'dateAdded' && "opacity-100")}>
                    {sortConfig?.direction === 'asc' ? '↓' : '↑'}
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
            {allContacts.length === 0 && syncing ? (
              <tr><td colSpan={6} className="py-32 text-center text-slate-300 font-black uppercase text-xs tracking-[0.5em] animate-pulse">Initializing Pulse Sync...</td></tr>
            ) : filteredAndSortedContacts.length === 0 ? (
              <tr><td colSpan={6} className="py-32 text-center text-slate-400 font-black text-sm tracking-widest opacity-30 italic">No Matching Dataset found locally.</td></tr>
            ) : (
              filteredAndSortedContacts.map((contact, index) => {
                const nextAppt = allAppointments.find(a => a.contactId === contact.id || a.email === contact.email);
                const resumeUrl = findResumeValue(contact);
                const isRefreshing = refreshingId === contact.id;
                
                return (
                  <tr key={contact.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-8 font-black text-slate-300 dark:text-slate-800 text-[10px] tracking-tight tabular-nums">#{index + 1}</td>
                    <td className="py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center relative overflow-hidden group-hover:bg-blue-600 group-hover:text-white transition-all">
                          {contact.firstName ? <span className="text-sm font-black">{contact.firstName[0].toUpperCase()}</span> : <Users className="w-4 h-4 opacity-30" />}
                          {isRefreshing && <div className="absolute inset-0 bg-blue-600 flex items-center justify-center animate-pulse"><RefreshCw className="w-4 h-4 animate-spin" /></div>}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight leading-none mb-1 uppercase group-hover:text-blue-600 transition-colors">{contact.firstName} {contact.lastName}</p>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider opacity-60">{contact.source || 'Direct'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-8">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-600 dark:text-slate-400 font-bold text-xs font-mono">{contact.email || '-'}</span>
                        <p className="text-[9px] text-slate-400 font-black tracking-widest uppercase">{contact.phone || 'No Contact'}</p>
                      </div>
                    </td>
                    <td className="py-8">
                      {nextAppt ? (
                        <div className="flex items-center gap-2 group/msg">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 tracking-tight">{format(new Date(nextAppt.startTime), 'MMM d, h:mm a')}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-0.5 w-6 bg-slate-100 dark:bg-slate-800 rounded-full opacity-40" />
                      )}
                    </td>
                    <td className="py-8">
                       <div className="flex items-center justify-center gap-2">
                         {resumeUrl ? (
                            <a href={resumeUrl} target="_blank" rel="noreferrer" title="Download CV" className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                              <FileText className="w-4 h-4" />
                            </a>
                         ) : (
                            <div className="p-2.5 opacity-20"><FileText className="w-4 h-4" /></div>
                         )}
                         <button onClick={() => syncContactDeep(contact.id)} title="Recursive Profile Sync" className={cn("p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all", isRefreshing && "animate-spin text-blue-600")}>
                           <RefreshCw className="w-4 h-4" />
                         </button>
                       </div>
                    </td>
                    <td className="py-8 text-right">
                      <p className="text-xs font-black text-slate-900 dark:text-white tracking-widest leading-none mb-1 tabular-nums lowercase">
                        {contact.dateAdded ? format(new Date(contact.dateAdded), 'yyyy') : '-'}
                      </p>
                      <span className="text-[9px] font-black text-slate-400 opacity-50 uppercase tracking-[0.2em]">
                        {contact.dateAdded ? format(new Date(contact.dateAdded), 'MMM dd') : '-'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Global Command Strip (Bottom Fixed Minimalism) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[1200px] h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex items-center justify-between px-6 sm:px-10 group/dock overflow-hidden">
        <div className="flex items-center gap-8 sm:gap-14 overflow-x-auto no-scrollbar">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Network</span>
            <p className="text-sm font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">
              {syncProgress.current.toLocaleString()}
              <span className="text-slate-400 font-bold mx-1">/</span>
              {syncProgress.total.toLocaleString()}
            </p>
          </div>
          <div className="h-6 w-[1px] bg-slate-100 dark:bg-slate-800 hidden md:block" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Pipeline</span>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tracking-tighter tabular-nums">${stats.totalValue.toLocaleString()}</p>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Efficiency</span>
            <p className="text-sm font-black text-blue-600 dark:text-blue-400 tracking-tighter tabular-nums">{stats.conversionRate}%</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {syncing ? (
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse">Pulse Sync Active</span>
              </div>
           ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Database Synced</span>
              </div>
           )}
        </div>
      </div>

    </div>
  );
}







