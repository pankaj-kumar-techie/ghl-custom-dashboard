import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    isConnected: boolean;
    isLoading: boolean;
    connect: () => void;
    disconnect: () => void;
    checkConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            // In a real app, check if we have a valid token in our DB for this user/session
            // For this demo, we might check local storage or a simple edge function call
            const { data: { session } } = await supabase.auth.getSession();
            // For now, we'll simulate connection check.
            // Replace this with actual check logic later.
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
        const authUrl = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?response_type=code&redirect_uri=${redirectUri}&client_id=${clientId}&scope=${scope}`;

        window.location.href = authUrl;
    };

    const disconnect = async () => {
        localStorage.removeItem('ghl_connected');
        setIsConnected(false);
    };

    return (
        <AuthContext.Provider value={{ isConnected, isLoading, connect, disconnect, checkConnection }}>
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
