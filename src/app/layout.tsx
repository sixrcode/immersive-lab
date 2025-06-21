import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { QueryProvider } from '@/components/layout/query-provider'; // Added

import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/header';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/AuthContext'; // Import AuthProvider

const geistSans = GeistSans;
const geistMono = GeistMono;

// Create a new QueryClient instance // Removed
// const queryClient = new QueryClient(); // Removed


export const metadata: Metadata = {
  title: 'Immersive Storytelling Lab',
  description: 'AI-powered co-pilot for cinematic expression by SIXR Immersive Storytelling Lab.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <body 
        className={cn(
          geistSans.variable, 
          geistMono.variable, 
          "font-sans antialiased"
        )}
        suppressHydrationWarning={true}
      >
        <QueryProvider>
          <AuthProvider> {/* Wrap with AuthProvider */}
            <SidebarProvider>
              <AppSidebar />
              <div className="flex flex-col flex-1 min-h-screen">
                <AppHeader />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                  {children}
                </main>
              </div>
            </SidebarProvider>
            <Toaster />
          </AuthProvider>
        </QueryProvider>

      </body>
    </html>
  );
}
