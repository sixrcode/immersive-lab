"use client";

import React, { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

type LoginStep = "credentials" | "mfa";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uiLoading, setUiLoading] = useState(false); // UI specific loading, distinct from auth context's loading
  const [showPassword, setShowPassword] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");

  const { signInUser, currentUser, mfaRequired, completeMfa, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if user is fully authenticated (including MFA if it was required)
    if (currentUser && !authLoading && !mfaRequired) {
      router.push('/');
    }
    // If user is present, auth is not loading, but MFA is still required, update UI
    if (currentUser && !authLoading && mfaRequired) {
      setLoginStep("mfa");
      setUiLoading(false); // Ensure UI loading for credentials stops
    }
  }, [currentUser, authLoading, mfaRequired, router]);


  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setUiLoading(true);
    try {
      await signInUser(email, password);
      // AuthProvider's onAuthStateChanged and the useEffect above will handle next steps (MFA or redirect)
    } catch (err: any) {
      let errorMessage = "Failed to sign in. Please check your credentials.";
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/invalid-credential': // Firebase v9+ uses invalid-credential for wrong password / user not found
            errorMessage = "Invalid email or password.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email format.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many login attempts. Please try again later.";
            break;
          default:
            errorMessage = `Login failed: ${err.message || 'Unknown error'}`;
        }
      }
      setError(errorMessage);
      console.error("Login error:", err);
      setUiLoading(false);
    }
    // No finally setLoading(false) here if signInUser was successful,
    // as onAuthStateChanged will take over and potentially set mfaRequired,
    // which then updates the UI via useEffect.
  };

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setUiLoading(true);
    try {
      await completeMfa(mfaCode);
      // Successful MFA completion will trigger onAuthStateChanged (if claims updated)
      // or the useEffect will redirect because mfaRequired becomes false.
      // router.push('/'); // This should be handled by useEffect
    } catch (err: any) {
      setError(err.message || "MFA validation failed.");
      setUiLoading(false);
    }
    // No finally setLoading(false) here if completeMfa was successful,
    // as onAuthStateChanged or useEffect will handle the redirect.
  };

  // This handles the case where the user navigates to /login but is already fully authenticated.
  if (currentUser && !authLoading && !mfaRequired && loginStep !== "mfa") {
     router.push('/');
     return <div className="flex justify-center items-center min-h-screen">Redirecting...</div>;
  }


  return (
    <div className="flex justify-center items-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        {loginStep === "credentials" && (
          <>
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center text-primary">Welcome Back</CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Sign in to access your Immersive Storytelling Lab dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-base"
                    disabled={uiLoading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-muted-foreground hover:text-foreground h-auto p-0"
                      disabled={uiLoading}
                    >
                      {showPassword ? <EyeOff className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
                      {showPassword ? "Hide" : "Show"}
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="text-base"
                      disabled={uiLoading}
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md">{error}</p>}
                <Button type="submit" className="w-full text-lg py-3" disabled={uiLoading || authLoading}>
                  {(uiLoading || authLoading) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Sign In"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col items-center text-sm">
              <p className="text-muted-foreground">
                {/* Don't have an account?{' '}
                <Link href="/signup" className="font-medium text-primary hover:underline">
                  Sign Up
                </Link> */}
              </p>
            </CardFooter>
          </>
        )}

        {loginStep === "mfa" && (
          <>
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center text-primary">Two-Factor Authentication</CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Enter the code from your authenticator app. (Hint: any 6 digits for this mock)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMfaSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mfaCode">Authentication Code</Label>
                  <Input
                    id="mfaCode"
                    type="text"
                    placeholder="123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    required
                    maxLength={6}
                    className="text-base text-center tracking-widest"
                    disabled={uiLoading}
                  />
                </div>
                {error && <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md">{error}</p>}
                <Button type="submit" className="w-full text-lg py-3" disabled={uiLoading || authLoading}>
                  {(uiLoading || authLoading) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><ShieldCheck className="mr-2 h-5 w-5" />Verify Code</>}
                </Button>
              </form>
            </CardContent>
             <CardFooter className="flex flex-col items-center text-sm">
                <Button variant="link" onClick={() => {
                    setEmail('');
                    setPassword('');
                    setMfaCode('');
                    setError(null);
                    setLoginStep('credentials');
                    // Consider if signOutUser should be called here if user wants to restart login
                }} disabled={uiLoading}>
                    Back to login
                </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
