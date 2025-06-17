
"use client";

// Type-only import for AI script analysis input/output
import type { AnalyzeScriptInput, AnalyzeScriptOutput } from '@/lib/ai-types';
// Note: `analyzeScript` function intentionally not imported here.
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ScanText, Lightbulb, Edit3, CheckCircle, XCircle, Copy } from "lucide-react";
import { useState, useEffect } from "react"; // Added useEffect
import { useForm } from "react-hook-form";
// Import Firebase auth to get ID token
import { getAuth, onAuthStateChanged } from "firebase/auth";
import firebaseApp from "@/lib/firebase"; // Assuming firebaseApp is initialized and exported from here
import { z } from "zod";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

type AnalyzeScriptOutputSuggestion = AnalyzeScriptOutput extends { suggestions: Array<infer S> } ? S : never;


// Placeholder function to represent getting the current user's ID token
// In a real app, this would use Firebase client SDK, e.g.,
// import { getAuth } from "firebase/auth";
// const auth = getAuth();
// const user = auth.currentUser;
// if (user) { const idToken = await user.getIdToken(); }
async function getCurrentUserIdToken(): Promise<string | null> {
  console.warn("getCurrentUserIdToken: Using placeholder ID token. Real Firebase client authentication required for this to work.");
  // This is a placeholder and will not work for actual authenticated calls.
  // Replace with actual Firebase client SDK logic to get the ID token.
  return "dummy-placeholder-id-token";
}

const formSchema = z.object({
  script: z.string().min(50, "Script must be at least 50 characters long."),
});

type FormValues = z.infer<typeof formSchema>;

export default function ScriptAnalyzerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalyzeScriptOutput | null>(null);
  const [currentUser, setCurrentUser] = useState<firebase.default.User | null>(null); // To store user
  const { toast } = useToast();
  const auth = getAuth(firebaseApp);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe(); // Cleanup subscription
  }, [auth]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      script: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setResults(null);

const idToken = await getCurrentUserIdToken();

if (!idToken) {
  toast({
    title: "Authentication Error",
    description: "You must be logged in to analyze scripts.",
    variant: "destructive", // optional if using variant-based styling
  });
  return;
}
        variant: "destructive",
        action: <XCircle className="text-red-500" />,
      });
      setIsLoading(false);
      return;
    }

    try {
const input: AnalyzeScriptInput = { script: values.script };

const response = await fetch('/api/script-analyzer/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`,
  },
  body: JSON.stringify(input),
});

if (!response.ok) {
  const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
  const errorMessage =
    errorData.details || errorData.error || `Request failed with status ${response.status}`;
  throw new Error(errorMessage);
}
      }

      const output: AnalyzeScriptOutput = await response.json();
      setResults(output);
      toast({
        title: "Script Analysis Complete!",
        description: "Review the analysis and suggestions below.",
        action: <CheckCircle className="text-green-500" />,
      });
} catch (error) {
  console.error("Error analyzing script:", error);
  toast({
    title: "Error Analyzing Script",
    description:
      error instanceof Error
        ? error.message
        : "Failed to analyze script. Please try again.",
    variant: "destructive", // optional: for styling if supported
  });
}
        variant: "destructive",
        action: <XCircle className="text-red-500" />,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleApplySuggestion = (suggestion: AnalyzeScriptOutputSuggestion) => {
    const currentScript = form.getValues("script");
    const sectionToReplace = suggestion.section || ""; 
    
    if (sectionToReplace && currentScript.includes(sectionToReplace)) {
      const newScript = currentScript.replace(sectionToReplace, suggestion.improvement || "");
      form.setValue("script", newScript, { shouldValidate: true, shouldDirty: true });
      toast({
        title: "Suggestion Applied!",
        description: "The suggestion has been applied to your script.",
        action: <CheckCircle className="text-green-500" />,
      });
    } else {
      toast({
        title: "Could Not Apply Suggestion",
        description: "The specific script section was not found. It might have been edited, or the AI's reference is not an exact match. Ensure the 'section' in the AI's output is a verbatim quote from the script.",
        variant: "destructive",
        duration: 7000,
        action: <XCircle className="text-red-500" />,
      });
    }
  };

  const handleCopyScript = async () => {
    const currentScript = form.getValues("script");
    if (!currentScript) {
      toast({
        title: "Nothing to Copy",
        description: "The script is empty.",
        variant: "destructive",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(currentScript);
      toast({
        title: "Script Copied!",
        description: "The current script has been copied to your clipboard.",
        action: <CheckCircle className="text-green-500" />,
      });
    } catch (err) {
      console.error('Failed to copy script: ', err);
      toast({
        title: "Copy Failed",
        description: "Could not copy the script. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ScanText className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">AI Script & Dialogue Analyzer</CardTitle>
          </div>
          <CardDescription>
            Paste your script below to get an AI-powered analysis, flagging unclear or off-tone sections and offering suggestions for improvement. You can apply suggestions directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="script"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-2">
                      <FormLabel className="text-lg">Your Script</FormLabel>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCopyScript}
                        disabled={isLoading || !form.getValues("script")}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Script
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Paste your script content here..."
                        className="min-h-[250px] resize-y bg-background shadow-inner"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <ScanText className="mr-2 h-4 w-4" />
                    Analyze Script
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6 text-center text-foreground">Analyzing Your Script...</h2>
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3 mx-auto" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-8 w-1/4 mx-auto mt-6" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      )}

      {results && !isLoading && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6 text-center text-foreground">Analysis Results</h2>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lightbulb className="h-6 w-6 text-accent" /> Overall Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/20 shadow-inner">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{results.analysis}</p>
              </ScrollArea>
            </CardContent>
          </Card>

          {results.suggestions && results.suggestions.length > 0 && (
            <Card className="mt-8 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Edit3 className="h-6 w-6 text-accent" /> Improvement Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {results.suggestions.map((suggestion, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger className="text-left hover:bg-muted/20 px-2 rounded-t-md">
 <span className="font-medium">Suggestion for: &#34;{suggestion.section && suggestion.section.length > 50 ? suggestion.section.substring(0, 50) + '...' : (suggestion.section || 'Unnamed Section')}&#34;</span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 p-4 bg-muted/30 rounded-b-md border-t-0 border">
                        <div>
                          <h4 className="font-semibold text-sm text-foreground mb-1">Issue Identified:</h4>
                          <p className="text-sm text-muted-foreground">{suggestion.issue}</p>
                        </div>
                        
                        {suggestion.section && (
                          <div>
                            <h4 className="font-semibold text-sm text-foreground mb-1">Original Section:</h4> 
                            <blockquote className="text-sm text-muted-foreground whitespace-pre-wrap bg-destructive/10 border-l-4 border-destructive p-3 rounded-md">
                              {suggestion.section}
                            </blockquote>
                          </div>
                        )}
                         
                        <div>
                          <h4 className="font-semibold text-sm text-foreground mb-1">Suggested Improvement:</h4> 
                           <blockquote className="text-sm text-muted-foreground whitespace-pre-wrap bg-primary/10 border-l-4 border-primary p-3 rounded-md">
                            {suggestion.improvement}
                          </blockquote>
                        </div>
                         <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplySuggestion(suggestion)}
                          className="mt-3 bg-accent/10 hover:bg-accent/20 text-accent-foreground border-accent/30"
                          disabled={isLoading}
                        >
                          <Edit3 className="mr-2 h-4 w-4" /> Apply Suggestion
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
           <p className="mt-8 text-xs text-muted-foreground text-center">
              AI Output Transparency: Analysis and suggestions are AI-generated. The &#34;section&#34; for suggestions must be an exact verbatim quote from your script for &#34;Apply Suggestion&#34; to work correctly. Review and refine all changes.
 </p>
        </div>
      )}
    </div>
  );
}
