'use client';

import React from 'react';
import { PromptInput } from '@/components/prompt-input';
import { PrototypeDisplay } from '@/components/prototype-display'; // Keep this import
import { useToast } from '@/hooks/use-toast';
import { useGeneratePrototype, type GeneratePrototypeHookInput } from "@/hooks/useGeneratePrototype"; // Import the hook
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import withAuth from '@/components/auth/withAuth'; // Import the HOC


function PromptToPrototypePageInternal() { // Renamed original component
  const { toast } = useToast();

  const {
    mutate: generatePrototypeMutate,
    data: generatedPrototypePackage,
    error: hookError,
    isPending,
  } = useGeneratePrototype();

  const handleFormSubmit = (submissionData: { prompt: string; imageDataUri?: string; stylePreset?: string }) => {
    const promptPackageForHook: GeneratePrototypeHookInput = {
      inputs: [{ prompt: submissionData.prompt }],
      params: {},
    };

    if (submissionData.stylePreset) {
      promptPackageForHook.params = { ...promptPackageForHook.params, stylePreset: submissionData.stylePreset };
    }
    if (submissionData.imageDataUri) {
      promptPackageForHook.params = { ...promptPackageForHook.params, imageDataUri: submissionData.imageDataUri };
    }
    if (Object.keys(promptPackageForHook.params || {}).length === 0) {
      delete promptPackageForHook.params;
    }

    generatePrototypeMutate(promptPackageForHook, {
      onSuccess: () => {
        toast({
          title: 'Prototype Generated!',
          description: 'Your new prototype is ready below.',
        });
      },
      onError: (error) => {
        console.error('Generation error:', error);
        toast({
          variant: 'destructive',
          title: 'Generation Failed',
          description: error.message || 'An unexpected error occurred during generation.',
        });
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
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Prompt-to-Prototype Studio
        </h1>
        <p className="mt-3 text-xl text-muted-foreground">
          Craft your vision. Generate loglines, mood boards, shot lists, and more from a simple prompt.
        </p>
      </header>

      <Card className="shadow-xl border-0 overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/80 via-primary to-secondary/80 p-6">
          <CardTitle className="text-2xl text-primary-foreground">Start Your Creation</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <PromptInput onSubmit={handleFormSubmit} isLoading={isPending} />
        </CardContent>
      </Card>

      {isPending && <LoadingSkeleton />}

      {hookError && !isPending && (
         <Card className="mt-8 border-destructive bg-destructive/5 text-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>An Error Occurred</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{hookError.message}</p>
          </CardContent>
        </Card>
      )}

      {!isPending && generatedPrototypePackage && (
        <div className="mt-10">
          <Separator className="my-8" />
          <PrototypeDisplay promptPackage={generatedPrototypePackage} />
        </div>
      )}
    </div>
  );
}

export default withAuth(PromptToPrototypePageInternal); // Wrap with HOC
