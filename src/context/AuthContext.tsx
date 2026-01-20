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

            // In a real app, check if we have a valid token in our DB for this user/session
            await supabase.auth.getSession();

            // For this demo, we check local storage
            const storedToken = localStorage.getItem('ghl_connected');
            setIsConnected(!!storedToken);
        } catch (error) {
            console.error('Error checking connection:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const connect = () => {
        // Redirect to GHL OAuth
        const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_GHL_REDIRECT_URI;
        const scope = "appointments.readonly calendars.readonly contacts.readonly opportunities.readonly users.readonly conversations.readonly";
        const authUrl = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${encodeURIComponent(clientId)}&scope=${scope}`;

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
