import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    isConnected: boolean;
    isLoading: boolean;
    isDemoMode: boolean;
    connect: () => void;
    enableDemoMode: () => void;
    disconnect: () => void;
    checkConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false);

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async (retryCount = 0) => {
        try {
            // Check for demo mode
            const demo = localStorage.getItem('ghl_demo_mode');
            if (demo === 'true') {
                setIsDemoMode(true);
                setIsConnected(true);
                setIsLoading(false);
                return;
            }

            console.log('Checking GHL connection status (Attempt ' + (retryCount + 1) + ')...');

            // First, check if there are any tokens in our Supabase table
            const { data, error, count } = await supabase
                .from('ghl_tokens')
                .select('location_id', { count: 'exact' })
                .limit(1);

            if (error) {
                console.error('Database connection check failed:', {
                    message: error.message,
                    hint: error.hint,
                    details: error.details,
                    code: error.code
                });
                
                if (error.code === 'PGRST116') {
                    // This is "no rows found" - not a real error
                    setIsConnected(false);
                } else if (error.message?.includes('policy') || error.code === '42501') {
                    console.error('CRITICAL: RLS Policy is blocking the connection check. Please run the SQL migration!');
                    setIsConnected(false);
                } else if (retryCount < 2) {
                    // Retry once for transient network errors
                    await new Promise(r => setTimeout(r, 1000));
                    return checkConnection(retryCount + 1);
                }
            } else if (data && data.length > 0) {
                console.log('GHL Connection verified successfully for location:', data[0].location_id);
                setIsConnected(true);
            } else {
                console.log('No GHL connection found in database.');
                setIsConnected(false);
            }
        } catch (error: any) {
            console.error('Unexpected error checking connection:', error);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const connect = () => {
        // Redirect to GHL OAuth
        const clientId = (import.meta.env.VITE_GHL_CLIENT_ID || '').trim();
        const redirectUri = (import.meta.env.VITE_GHL_REDIRECT_URI || '').trim();
        const scope = "businesses.readonly businesses.write calendars.readonly calendars.write contacts.readonly contacts.write opportunities.readonly opportunities.write locations.readonly forms.readonly forms.write";
        const authUrl = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${encodeURIComponent(clientId)}&scope=${scope}`;

        console.log('Connecting to GHL:', { clientId, redirectUri, authUrl });
        window.location.href = authUrl;
    };

    const enableDemoMode = () => {
        localStorage.setItem('ghl_demo_mode', 'true');
        setIsDemoMode(true);
        setIsConnected(true);
    };

    const disconnect = async () => {
        localStorage.removeItem('ghl_connected');
        localStorage.removeItem('ghl_demo_mode');
        setIsConnected(false);
        setIsDemoMode(false);
    };

    return (
        <AuthContext.Provider value={{ isConnected, isLoading, isDemoMode, connect, enableDemoMode, disconnect, checkConnection }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
