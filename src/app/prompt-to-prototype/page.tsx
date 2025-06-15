'use client';

import React, { useState } from 'react';
import { PromptInput } from '@/components/prompt-input';
import { PrototypeDisplay } from '@/components/prototype-display';
import { PromptPackage as PagePromptPackage } from '@/lib/types'; // Alias existing import
import { useToast } from '@/hooks/use-toast';
import { useGeneratePrototype, PromptPackage as HookPromptPackage } from "@/hooks/useGeneratePrototype"; // Import the hook
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';


export default function PromptToPrototypePage() {
  const { toast } = useToast();

  const {
    mutate: generatePrototypeMutate, // Renamed to avoid conflict if a handleGenerate function wrapper is kept
    data: generatedPrototypePackage, // This should be HookPromptPackage | undefined
    isLoading,
    error: hookError, // This is Error | null
  } = useGeneratePrototype();

  const handleFormSubmit = (submissionData: { prompt: string; imageDataUri?: string; stylePreset?: string }) => {
    const promptPackageForHook: HookPromptPackage = {
      inputs: [{ prompt: submissionData.prompt }],
      params: {}, // Initialize params
    };

    if (submissionData.stylePreset) {
      promptPackageForHook.params = { ...promptPackageForHook.params, stylePreset: submissionData.stylePreset };
    }
    if (submissionData.imageDataUri) {
      promptPackageForHook.params = { ...promptPackageForHook.params, imageDataUri: submissionData.imageDataUri };
    }
    if (Object.keys(promptPackageForHook.params).length === 0) {
      delete promptPackageForHook.params; // Remove params if empty, as per original hook structure
    }

    generatePrototypeMutate(promptPackageForHook, {
      onSuccess: (data) => { // data here is the result from the mutationFn, assumed to be HookPromptPackage
        toast({
          title: 'Prototype Generated!',
          description: 'Your new prototype is ready below.',
        });
        // No need to set local state for data, `generatedPrototypePackage` will update
      },
      onError: (error) => { // error here is the Error object
        console.error('Generation error:', error);
        toast({
          variant: 'destructive',
          title: 'Generation Failed',
          description: error.message || 'An unexpected error occurred during generation.',
        });
        // No need to set local state for error, `hookError` will update
      },
    });
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
          {/* Pass handleFormSubmit directly to PromptInput */}
          <PromptInput onSubmit={handleFormSubmit} isLoading={isLoading} />
        </CardContent>
      </Card>

      {isLoading && <LoadingSkeleton />}

      {hookError && !isLoading && (
         <Card className="mt-8 border-destructive bg-destructive/5 text-destructive"> {/* Lighter error bg */}
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>An Error Occurred</CardTitle>
            {/* Error state is now directly from the hook, no local dismiss function for hookError directly,
                but re-submitting might clear it or it might persist until a successful call.
                For a manual dismiss, one might need a separate local state flag if the hook doesn't auto-reset error.
                Keeping it simple for now by just displaying the error.
            */}
            {/* <Button variant="ghost" size="sm" onClick={() => hookError = null} aria-label="Dismiss error">
              Dismiss
            </Button> */}
          </CardHeader>
          <CardContent>
            <p>{hookError.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Display PrototypeDisplay when data (generatedPrototypePackage) is available and not loading */}
      {!isLoading && generatedPrototypePackage && (
        <div className="mt-10"> {/* Add more spacing before results */}
          <Separator className="my-8" />
          {/* Ensure useGeneratePrototype returns the PromptPackage object as data */}
          {/* And PrototypeDisplay expects a prop named promptPackage */}
          <PrototypeDisplay promptPackage={generatedPrototypePackage} />
        </div>
      )}
    </div>
  );
}
