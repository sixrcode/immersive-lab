"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  Auth,
  IdTokenResult,
  UserCredential
} from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isCreator: boolean;
  mfaRequired: boolean; // New state to indicate if MFA step is needed
  idTokenResult: IdTokenResult | null;
  signInUser: (email: string, pass: string) => Promise<UserCredential>;
  signUpUser: (email: string, pass: string) => Promise<UserCredential>;
  signOutUser: () => Promise<void>;
  completeMfa: (code: string) => Promise<void>; // New function for MFA completion
  fetchTokenResult: (forceRefresh?: boolean) => Promise<IdTokenResult | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Read the environment variable for 2FA
const enableCreator2FA = process.env.NEXT_PUBLIC_ENABLE_CREATOR_2FA === 'true';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [idTokenResult, setIdTokenResult] = useState<IdTokenResult | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false); // Initialize mfaRequired
  const auth: Auth = getAuth(firebaseApp);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true); // Set loading true while processing user state
      if (user) {
        setCurrentUser(user);
        try {
          const tokenResult = await user.getIdTokenResult(true); // Force refresh to get latest claims
          setIdTokenResult(tokenResult);
          const userIsCreator = tokenResult.claims.creator === true;
          setIsCreator(userIsCreator);

          // Check if MFA is required
          if (enableCreator2FA && userIsCreator && user.emailVerified) { // Check if email is verified for MFA based on the user object
            // For this mock, assume MFA is required if not already marked as completed this session
            // A real implementation might check a persistent flag or a session-specific claim
             if (!sessionStorage.getItem('mfaCompletedForSession')) {
               setMfaRequired(true);
             } else {
               setMfaRequired(false);
             }
          } else {
            setMfaRequired(false);
          }
        } catch (error) {
          console.error("Error fetching ID token result:", error);
          setIsCreator(false);
          setIdTokenResult(null); // Ensure state is reset on error
          setMfaRequired(false);
          // If token fetching fails critically (e.g., revoked session), sign out
          if (error instanceof Error && typeof (error as { code?: string }).code === 'string') {
            const errorCode = (error as { code: string }).code;
            if (errorCode === 'auth/user-token-expired' || errorCode === 'auth/invalid-user-token') {
              await signOut(auth).catch((err) => console.error("Error during signOut after token error:", err));
            }
          }
        }
      } else {
        setCurrentUser(null);
        setIsCreator(false);
        setIdTokenResult(null);
        setMfaRequired(false);
        sessionStorage.removeItem('mfaCompletedForSession');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const signInUser = async (email: string, pass: string): Promise<UserCredential> => {
    setLoading(true);
    // Clear any previous session MFA status
    sessionStorage.removeItem('mfaCompletedForSession');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting user, claims, and mfaRequired state
      // No need to setLoading(false) here, onAuthStateChanged will do it.
      return userCredential;
    } catch (error) {
      setLoading(false); // Set loading false on error
      throw error; // Re-throw error to be caught by login page
    }
  };

  const signUpUser = (email: string, pass: string) => {
    setLoading(true);
    sessionStorage.removeItem('mfaCompletedForSession');
    return createUserWithEmailAndPassword(auth, email, pass);
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      sessionStorage.removeItem('mfaCompletedForSession');
      // onAuthStateChanged will set currentUser to null
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      setLoading(false);
    }
    // setLoading(false) is handled by onAuthStateChanged after user becomes null
  };

  const completeMfa = async (code: string) => {
    // Mock MFA completion: In a real app, verify the code with a backend.
    // For this task, any 6-digit code is considered valid.
    if (enableCreator2FA && isCreator && mfaRequired) {
      if (code && code.length === 6 && /^\d+$/.test(code)) {
        console.log("MFA code accepted (mocked):", code);
        sessionStorage.setItem('mfaCompletedForSession', 'true'); // Mark MFA as completed for this session
        setMfaRequired(false);
        // Potentially, you might want to refresh the token if the backend sets a specific claim after MFA
        // await fetchTokenResult(true);
      } else {
        throw new Error("Invalid MFA code (mock). Please enter a 6-digit number.");
      }
    }
  };

  const fetchTokenResult = async (forceRefresh: boolean = false): Promise<IdTokenResult | null> => {
    if (currentUser) {
      try {
        const tokenResult = await currentUser.getIdTokenResult(forceRefresh);
        setIdTokenResult(tokenResult);
        setIsCreator(tokenResult.claims.creator === true);
        // Check MFA status again after fetching tokenResult, in case claims changed
         if (enableCreator2FA && tokenResult.claims.creator === true && currentUser.emailVerified && !sessionStorage.getItem('mfaCompletedForSession')) { // Also check email verification
           setMfaRequired(true);
         } else if (!(enableCreator2FA && tokenResult.claims.creator === true)) {
           setMfaRequired(false);
         }

        return tokenResult;
      } catch (error) {
         // Check if error is an instance of Error and has a 'code' property
         console.error("Error fetching ID token result in fetchTokenResult:", error);
        if (error instanceof Error && typeof (error as { code?: string }).code === 'string') {
          const errorCode = (error as { code: string }).code;
          if (errorCode === 'auth/user-token-expired' || errorCode === 'auth/invalid-user-token') {
            await signOutUser(); // Use the context's signOutUser which handles redirect
          }
        }
        // Reset states if token fetching fails
        setIsCreator(false);
        setIdTokenResult(null);
        setMfaRequired(false);
        return null;
      }
    }
    return null;
  };

  const value = {
    currentUser,
    loading,
    isCreator,
    idTokenResult,
    mfaRequired,
    signInUser,
    signUpUser,
    signOutUser,
    completeMfa,
    fetchTokenResult,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
