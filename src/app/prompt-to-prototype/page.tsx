
"use client";

import type { PromptToPrototypeInput, PromptToPrototypeOutput } from "@/ai/flows/prompt-to-prototype";
import { promptToPrototype } from "@/ai/flows/prompt-to-prototype";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles, FileText, ListChecks, Video } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters long."),
});

type FormValues = z.infer<typeof formSchema>;

interface ResultCardProps {
  title: string;
  icon: ReactNode;
  content: ReactNode | string;
  isLoading: boolean;
}

function ResultCard({ title, icon, content, isLoading }: ResultCardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        {icon}
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          title === "Mood Board" ? <Skeleton className="h-64 w-full" /> : <Skeleton className="h-20 w-full" />
        ) : (
          typeof content === 'string' ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p> : content
        )}
      </CardContent>
    </Card>
  );
}


export default function PromptToPrototypePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PromptToPrototypeOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setResults(null);
    try {
      const input: PromptToPrototypeInput = { prompt: values.prompt };
      const output = await promptToPrototype(input);
      setResults(output);
      toast({
        title: "Prototype Generated!",
        description: "Your assets are ready.",
      });
    } catch (error) {
      console.error("Error generating prototype:", error);
      toast({
        title: "Error",
        description: "Failed to generate prototype. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">Prompt-to-Prototype Studio</CardTitle>
          </div>
          <CardDescription>
            Enter a prompt to generate a mood board, logline, shot list, and proxy clip description.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg">Your Creative Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., A lone astronaut discovers a mysterious signal on a desolate Mars colony..."
                        className="min-h-[100px] resize-none"
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
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Prototype
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(isLoading || results) && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6 text-center text-foreground">Generated Assets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResultCard
              title="Mood Board"
              icon={<Sparkles className="h-6 w-6 text-accent" />}
              isLoading={isLoading && !results?.moodBoardImage}
              content={
                results?.moodBoardImage ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                    {/* Using img tag for data URI compatibility. Next/Image needs loader for external URLs primarily. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                        src={results.moodBoardImage} 
                        alt="Generated Mood Board" 
                        className="object-cover w-full h-full"
                        data-ai-hint="mood board"
                    />
                  </div>
                ) : <Skeleton className="h-64 w-full" />
              }
            />
            <ResultCard
              title="Logline"
              icon={<FileText className="h-6 w-6 text-accent" />}
              isLoading={isLoading && !results?.logline}
              content={results?.logline || ""}
            />
            <ResultCard
              title="Shot List"
              icon={<ListChecks className="h-6 w-6 text-accent" />}
              isLoading={isLoading && !results?.shotList}
              content={results?.shotList || ""}
            />
            <ResultCard
              title="Proxy Clip Description"
              icon={<Video className="h-6 w-6 text-accent" />}
              isLoading={isLoading && !results?.proxyClipDescription}
              content={results?.proxyClipDescription || ""}
            />
          </div>
          {results && !isLoading && (
            <p className="mt-4 text-sm text-muted-foreground text-center">
              AI Output Transparency: Assets generated by AI. Review and refine as needed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
