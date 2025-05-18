
"use client";

import type { PromptToPrototypeInput, PromptToPrototypeOutput } from "@/ai/flows/prompt-to-prototype";
import { promptToPrototype } from "@/ai/flows/prompt-to-prototype";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles, FileText, ListChecks, Video, Image as ImageIcon, Palette } from "lucide-react";
import { useState, type ReactNode, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters long."),
});

type FormValues = z.infer<typeof formSchema>;

interface ResultCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  isLoading: boolean;
  loadingHeight?: string;
}

function ResultCard({ title, icon, children, isLoading, loadingHeight = "h-32" }: ResultCardProps) {
  return (
    <Card className="shadow-lg flex flex-col">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        {icon}
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        {isLoading ? (
          <Skeleton className={`w-full ${loadingHeight}`} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

interface Shot {
  number: string;
  lens: string;
  move: string;
  framing: string;
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
      let errorMessage = "Failed to generate prototype. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Error Generating Prototype",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const parsedShotList: Shot[] = useMemo(() => {
    if (!results?.shotList) return [];
    return results.shotList
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        const parts = line.split(',');
        return {
          number: parts[0]?.trim() || "",
          lens: parts[1]?.trim() || "",
          move: parts[2]?.trim() || "",
          framing: parts.slice(3).join(',').trim() || "", // Join remaining parts for framing notes
        };
      });
  }, [results?.shotList]);

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">Prompt-to-Prototype Studio</CardTitle>
          </div>
          <CardDescription>
            Enter a prompt to generate a mood board concept (image + 3x3 grid description), three logline variants, a shot list, and a proxy clip animatic description. Process takes up to 30 seconds.
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
                    Generating Assets...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Prototype Package
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
              icon={<Palette className="h-6 w-6 text-accent" />}
              isLoading={isLoading && (!results?.moodBoardImage && !results?.moodBoardDescription)}
              loadingHeight="h-80"
            >
              <>
                <h4 className="font-semibold text-sm mb-1 text-foreground">Representative Mood Board Image:</h4>
                {results?.moodBoardImage ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-md border mb-4">
                    <img 
                        src={results.moodBoardImage} 
                        alt="Generated Mood Board Representation" 
                        className="object-cover w-full h-full"
                        data-ai-hint="mood board concept"
                    />
                  </div>
                ) : (!isLoading && <p className="text-sm text-muted-foreground mb-2">No representative image generated.</p>)}
                
                <h4 className="font-semibold text-sm mb-1 text-foreground">Detailed 3x3 Grid Concept / Guide:</h4>
                {results?.moodBoardDescription ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{results.moodBoardDescription}</p>
                ) : (!isLoading && <p className="text-sm text-muted-foreground">No grid description available.</p>)}
              </>
            </ResultCard>

            <ResultCard
              title="Logline Variants"
              icon={<FileText className="h-6 w-6 text-accent" />}
              isLoading={isLoading && !results?.loglines}
              loadingHeight="h-40"
            >
              {results?.loglines && results.loglines.length > 0 ? (
                <div className="space-y-3">
                  {results.loglines.map((logline, index) => (
                    <div key={index} className="p-2 border rounded-md bg-muted/50">
                      <Badge variant="secondary" className="mb-1">{logline.tone || `Variant ${index + 1}`}</Badge>
                      <p className="text-sm text-muted-foreground">{logline.text}</p>
                    </div>
                  ))}
                </div>
              ) : (!isLoading && <p className="text-sm text-muted-foreground">No loglines generated.</p>)}
            </ResultCard>

            <ResultCard
              title="Shot List (6-10 shots)"
              icon={<ListChecks className="h-6 w-6 text-accent" />}
              isLoading={isLoading && !results?.shotList}
              loadingHeight="h-60"
            >
              {parsedShotList.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%]">Shot #</TableHead>
                        <TableHead className="w-[25%]">Lens</TableHead>
                        <TableHead className="w-[30%]">Camera Move</TableHead>
                        <TableHead className="w-[30%]">Framing Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedShotList.map((shot, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{shot.number}</TableCell>
                          <TableCell>{shot.lens}</TableCell>
                          <TableCell>{shot.move}</TableCell>
                          <TableCell>{shot.framing}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (!isLoading && <p className="text-sm text-muted-foreground">No shot list generated.</p>)}
            </ResultCard>

            <ResultCard
              title="Proxy Clip Animatic Description"
              icon={<Video className="h-6 w-6 text-accent" />}
              isLoading={isLoading && !results?.proxyClipAnimaticDescription}
              loadingHeight="h-40"
            >
                {results?.proxyClipAnimaticDescription ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{results.proxyClipAnimaticDescription}</p>
                ) : (!isLoading && <p className="text-sm text-muted-foreground">No animatic description available.</p>)}
            </ResultCard>
          </div>
          {results && !isLoading && (
            <p className="mt-6 text-sm text-muted-foreground text-center">
              AI Output Transparency: Assets generated by AI. Review and refine as needed. Use the 3x3 mood board description to guide further visual development.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
