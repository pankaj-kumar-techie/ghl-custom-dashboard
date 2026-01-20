import React from 'react';

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-transparent font-sans">
            <main className="p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </div>
    );
}

