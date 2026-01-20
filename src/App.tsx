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
  const { connect } = useAuth();

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-6 max-w-md px-6">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
        <p className="text-gray-500 dark:text-gray-400">Connect your HighLevel account to view your dashboard.</p>
        <button
          onClick={connect}
          className="px-6 py-3 bg-[#155eea] hover:bg-[#104ab0] text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all w-full flex items-center justify-center"
        >
          Connect with HighLevel
        </button>
      </div>
    </div>
  );
}

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
        setStatus('error');
        setErrorMsg('No authorization code found.');
        return;
      }

      try {
        // Call Supabase Edge Function to exchange code
        const { error } = await supabase.functions.invoke('ghl-oauth', {
          body: { code }, // We might need to handle this as URL params depending on how we wrote the function. 
          // The function expects: `url.searchParams.get("code")`
          // So we should append it to the URL query string of the function call?
          // Supabase invoke passes body as JSON usually.
          // Let's check how I wrote the function: 
          // `const url = new URL(req.url); const code = url.searchParams.get("code");`
          // Ah, I wrote it to expect query param.
        });

        // Correction: invoke() sends POST by default with JSON body. 
        // My function expects GET with query param OR I should update function to read from body.
        // I should probably update the function or change how I call it. 
        // Changing call to pass raw URL is harder with client.invoke?
        // Actually client.invoke supports 'method' and 'headers'. 
        // But to pass Query params to Edge Function via invoke is:
        // invoke('ghl-oauth?code=' + code) -- this works if I append to function name? No.

        // Let's try calling fetch directly to be safe, or fix function.
        // Fixing function to use JSON body is cleaner for POST. 
        // But OAuth callback *from GHL* is GET.
        // But *react* is calling the function. So I can choose. POST is better.
        // I will update the function in next step to support JSON body code. 
        // For now, let's assume I'll fix the function.

        if (error) throw error;

        // Wait a bit and check connection
        await checkConnection();
        setStatus('success');
      } catch (err: any) {
        console.error("Exchange error:", err);
        setStatus('error');
        setErrorMsg(err.message || 'Failed to exchange token');
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
