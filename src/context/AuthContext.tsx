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

    const checkConnection = async () => {
        try {
            // Check for demo mode
            const demo = localStorage.getItem('ghl_demo_mode');
            if (demo === 'true') {
                setIsDemoMode(true);
                setIsConnected(true);
                setIsLoading(false);
                return;
            }

            // First, check if there are any tokens in our Supabase table
            const { data, error } = await supabase
                .from('ghl_tokens')
                .select('location_id')
                .limit(1);

            if (data && data.length > 0) {
                setIsConnected(true);
            } else {
                setIsConnected(false);
            }
        } catch (error) {
            console.error('Error checking connection:', error);
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
