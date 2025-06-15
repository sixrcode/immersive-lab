'use client';

import React, { useState } from 'react';
import { PromptInput } from '@/components/prompt-input';
import { PrototypeDisplay } from '@/components/prototype-display';
import { PromptPackage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';


export default function PromptToPrototypePage() {
  const [promptPackageResult, setPromptPackageResult] = useState<PromptPackage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async (data: { prompt: string; imageDataUri?: string; stylePreset?: string }) => {
    setIsLoading(true);
    setError(null);
    setPromptPackageResult(null);

    try {
      const response = await fetch('/api/prototype/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `API Error: ${response.statusText} (Status: ${response.status})`;
        let errorDetails = ""
        if (errorData.details) {
            if (Array.isArray(errorData.details) && errorData.details.length > 0 && errorData.details[0] && typeof errorData.details[0].message === 'string') {
                 errorDetails = errorData.details.map((d:any) => d.message).join(', ');
            } else if (typeof errorData.details === 'string') {
                errorDetails = errorData.details;
            } else if (typeof errorData.details === 'object') { // Handle nested Zod error objects
                errorDetails = JSON.stringify(errorData.details);
            }
        }
        console.error('API Error:', errorMessage, errorDetails ? `Details: ${errorDetails}` : '');
        const fullError = `${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`;
        setError(fullError);
        toast({
          variant: 'destructive',
          title: 'Generation Failed',
          description: fullError,
        });
        setPromptPackageResult(null);
        return;
      }

      const result: PromptPackage = await response.json();
      setPromptPackageResult(result);
      toast({
        title: 'Prototype Generated!',
        description: 'Your new prototype is ready below.',
      });

    } catch (err: any) {
      console.log("DEBUG: Entering main catch block in handleGenerate.");
      if (err instanceof Error && err.message.includes("Unexpected token '<'")) {
        console.log("DEBUG: Error indicates HTML response instead of JSON.");
        // The 'response' object from the try block is not directly in scope here.
        // The original error message (err.message) already includes the problematic token,
        // which is a strong indicator. This log helps confirm we've hit that specific scenario.
      }
      console.error('Network or parsing error:', err);
      const message = err.message || 'An unexpected error occurred.';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
      setPromptPackageResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const LoadingSkeleton = () => (
    <Card className="mt-8 animate-pulse">
      <CardHeader>
        <Skeleton className="h-8 w-1/3 bg-muted" />
      </CardHeader>
      <CardContent className="space-y-6">
        <Skeleton className="h-6 w-1/4 bg-muted" />
        <Skeleton className="h-20 w-full bg-muted" />
        <Separator />
        <Skeleton className="h-6 w-1/4 bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full bg-muted" />
          <Skeleton className="h-32 w-full bg-muted" />
          <Skeleton className="h-32 w-full bg-muted" />
        </div>
        <Skeleton className="h-40 w-full bg-muted" />
        <Separator />
        <Skeleton className="h-6 w-1/4 bg-muted" />
        <Skeleton className="h-20 w-full bg-muted" />
      </CardContent>
    </Card>
  );


  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl"> {/* Constrain width for better readability */}
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Prompt-to-Prototype Studio
        </h1>
        <p className="mt-3 text-xl text-muted-foreground">
          Craft your vision. Generate loglines, mood boards, shot lists, and more from a simple prompt.
        </p>
      </header>

      <Card className="shadow-xl border-0 overflow-hidden"> {/* Subtle shadow, remove border */}
        <CardHeader className="bg-gradient-to-br from-primary/80 via-primary to-secondary/80 p-6"> {/* Gradient header */}
          <CardTitle className="text-2xl text-primary-foreground">Start Your Creation</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <PromptInput onSubmit={handleGenerate} isLoading={isLoading} />
        </CardContent>
      </Card>

      {isLoading && <LoadingSkeleton />}

      {error && !isLoading && (
         <Card className="mt-8 border-destructive bg-destructive/5 text-destructive"> {/* Lighter error bg */}
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>An Error Occurred</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} aria-label="Dismiss error">
              Dismiss
            </Button>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && promptPackageResult && (
        <div className="mt-10"> {/* Add more spacing before results */}
          <Separator className="my-8" />
          <PrototypeDisplay promptPackage={promptPackageResult} />
        </div>
      )}
    </div>
  );
}
