import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Leads } from './pages/Leads';
import { supabase } from './lib/supabase';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isConnected) {
    return <ConnectPage />;
  }

  return <Layout>{children}</Layout>;
}

function ConnectPage() {
  const { connect, enableDemoMode } = useAuth();

  return (
    <div className="flex h-screen items-center justify-center bg-[#fcfcfd] dark:bg-slate-950 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden relative">
      {/* Premium Gradient Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="text-center space-y-8 max-w-lg px-8 py-16 bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-8 transform -rotate-6 hover:rotate-0 transition-transform duration-500">
          <span className="text-3xl font-black text-white tracking-tighter">GHL</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-black text-slate-950 dark:text-white tracking-tighter leading-[0.95]">
            Experience <br /><span className="text-blue-600">The Future.</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed max-w-sm mx-auto">
            Bridge your HighLevel ecosystem into a high-performance custom dashboard. 
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <button
            onClick={connect}
            className="group relative px-8 py-4 bg-slate-950 dark:bg-white dark:text-slate-950 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all w-full overflow-hidden"
          >
            <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
            <span className="relative z-10">Connect HighLevel</span>
          </button>

          <button
            onClick={enableDemoMode}
            className="px-8 py-4 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all w-full"
          >
            Enter Demo Sandbox
          </button>
        </div>
        
        <div className="pt-8 border-t border-slate-50 dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                Trusted by 2,000+ HighLevel Agencies
            </p>
        </div>
      </div>
    </div>
  );
}

const exchangedCodes = new Set<string>();

function CallbackPage() {
  const { isConnected, checkConnection } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const location = useLocation();

  useEffect(() => {
    const exchangeCode = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');

      if (!code) {
        if (status === 'loading') {
          setStatus('error');
          setErrorMsg('No authorization code found.');
        }
        return;
      }

      if (exchangedCodes.has(code)) {
        console.log("Code already being exchanged or failed, skipping duplicate call:", code.substring(0, 5) + "...");
        return;
      }

      try {
        exchangedCodes.add(code);
        console.log("Exchanging GHL code:", code.substring(0, 5) + "...");
        
        const { error } = await supabase.functions.invoke('ghl-oauth', {
          body: { code },
        });

        if (error) {
          console.error("Edge function error response:", error);
          throw error;
        }

        console.log("Token exchange successful, checking connection...");

        // Wait a bit and check connection
        await new Promise(resolve => setTimeout(resolve, 1500));
        await checkConnection();
        setStatus('success');
      } catch (err: any) {
        console.error("Full exchange error details:", err);
        setStatus('error');
        
        let message = 'Failed to connect to authentication service.';
        if (err.message?.includes('invalid_grant')) {
          message = 'The authorization code is invalid or has expired. Please try connecting again.';
        } else if (err.status === 400) {
          message = 'Authentication failed (400). This code may have already been used.';
        } else if (err.message) {
          message = err.message;
        }
        
        setErrorMsg(message);
        // We DO NOT reset exchangedCodes here because once a code is tried, 
        // it's usually invalid for reuse anyway.
      }
    };

    if (!isConnected && status === 'loading') {
      exchangeCode();
    }
  }, [location, isConnected, checkConnection, status]);

  if (isConnected || status === 'success') {
    return <Navigate to="/" replace />;
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-red-600 text-xl font-bold">Connection Failed</h1>
        <p className="text-gray-600">{errorMsg}</p>
        <Link to="/" className="text-blue-600 hover:underline">Return Home</Link>
      </div>
    );
  }

  return <div className="flex h-screen items-center justify-center">Connecting to HighLevel...</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<CallbackPage />} />
          <Route path="/" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

      </BrowserRouter>
    </AuthProvider>
  );
}
