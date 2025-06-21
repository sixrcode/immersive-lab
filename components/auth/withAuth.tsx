"use client";

import React, { ComponentType, useEffect } from 'react';
import { useAuth } from '@/services/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const withAuth = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const ComponentWithAuth = (props: P) => {
    const { currentUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !currentUser) {
        router.push('/login');
      }
    }, [currentUser, loading, router]);

    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }

    if (!currentUser) {
      // This case should ideally be handled by the useEffect redirect,
      // but as a fallback, prevent rendering the component if not logged in.
      // Or, if router.push hasn't completed, show a message or minimal UI.
      return (
        <div className="flex justify-center items-center min-h-screen">
          <p>Redirecting to login...</p>
          <Loader2 className="ml-2 h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };

  // Set a display name for easier debugging
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  ComponentWithAuth.displayName = `withAuth(${displayName})`;

  return ComponentWithAuth;
};

export default withAuth;
