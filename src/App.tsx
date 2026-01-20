import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Appointments } from './pages/Appointments';
import { supabase } from './lib/supabase';

// Placeholder components for other pages
const Leads = () => <h1 className="text-2xl font-bold">Leads</h1>;
const Opportunities = () => <h1 className="text-2xl font-bold">Opportunities</h1>;
const Orders = () => <h1 className="text-2xl font-bold">Orders</h1>;

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
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-6 max-w-md px-6">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
        <p className="text-gray-500 dark:text-gray-400">Connect your HighLevel account to view your dashboard.</p>

        <div className="space-y-3">
          <button
            onClick={connect}
            className="px-6 py-3 bg-[#155eea] hover:bg-[#104ab0] text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all w-full flex items-center justify-center"
          >
            Connect with HighLevel
          </button>

          <button
            onClick={enableDemoMode}
            className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold rounded-lg shadow-sm hover:shadow transition-all w-full flex items-center justify-center"
          >
            View Demo (No Login)
          </button>
        </div>
        <p className="text-xs text-gray-400">Use Demo mode to verify UI without GHL connection.</p>
      </div>
    </div>
  );
}

function CallbackPage() {
  const { isConnected, checkConnection } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const location = useLocation();

  const hasExchanged = React.useRef(false);

  useEffect(() => {
    const exchangeCode = async () => {
      if (hasExchanged.current) return;
      
      const params = new URLSearchParams(location.search);
      const code = params.get('code');

      if (!code) {
        setStatus('error');
        setErrorMsg('No authorization code found.');
        return;
      }

      try {
        hasExchanged.current = true;
        const { error } = await supabase.functions.invoke('ghl-oauth', {
          body: { code },
        });

        if (error) throw error;

        // Wait a bit and check connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        await checkConnection();
        setStatus('success');
      } catch (err: any) {
        console.error("Full exchange error:", err);
        setStatus('error');
        setErrorMsg(err.message || 'Failed to connect to authentication service. Please check your internet and try again.');
        hasExchanged.current = false; // Allow retry if it failed
      }
    };

    if (!isConnected) {
      exchangeCode();
    }
  }, [location, isConnected, checkConnection]);

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
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
          <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
          <Route path="/opportunities" element={<ProtectedRoute><Opportunities /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
