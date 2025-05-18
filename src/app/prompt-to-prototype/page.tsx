
"use client";

import type { PromptToPrototypeInput, PromptToPrototypeOutput } from "@/ai/flows/prompt-to-prototype";
import { promptToPrototype } from "@/ai/flows/prompt-to-prototype";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles, FileText, ListChecks, Video, Palette } from "lucide-react"; // Removed ImageIcon as it's not used
import NextImage from "next/image"; // Using NextImage for optimized images
import { useState, type ReactNode, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

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
  className?: string;
}

function ResultCard({ title, icon, children, isLoading, loadingHeight = "h-32", className }: ResultCardProps) {
  return (
    <Card className={cn("shadow-lg flex flex-col", className)}>
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
      .filter(line => line) // Filter out empty lines
      .map(line => {
        const parts = line.split(',');
        return {
          number: parts[0]?.trim() || "",
          lens: parts[1]?.trim() || "",
          move: parts[2]?.trim() || "",
          framing: parts.slice(3).join(',').trim() || "",
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
              title="Mood Board Concept"
              icon={<Palette className="h-6 w-6 text-accent" />}
              isLoading={isLoading && (!results?.moodBoardImage || !results?.moodBoardCells)}
              loadingHeight="h-96" // Adjusted for potentially more content
              className="md:col-span-2" // Make this card span two columns on medium screens and up
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-foreground">Representative Mood Board Image:</h4>
                  {results?.moodBoardImage ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-md border mb-4 shadow-md">
                      <NextImage 
                          src={results.moodBoardImage} 
                          alt="Generated Mood Board Representation" 
                          layout="fill"
                          objectFit="cover"
                          data-ai-hint="mood board concept"
                      />
                    </div>
                  ) : (!isLoading && <p className="text-sm text-muted-foreground mb-2">No representative image generated.</p>)}
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-foreground">Detailed 3x3 Grid Cell Descriptions:</h4>
                  {results?.moodBoardCells && results.moodBoardCells.length === 9 ? (
                    <div className="grid grid-cols-3 gap-2 border p-2 rounded-md bg-background shadow-inner">
                      {results.moodBoardCells.map((cellDescription, index) => (
                        <div 
                          key={index} 
                          className="border p-2.5 rounded text-xs text-muted-foreground bg-card aspect-square flex flex-col justify-start items-start overflow-y-auto min-h-[100px] max-h-[150px] shadow-sm"
                          aria-label={`Mood board cell ${index + 1} description`}
                        >
                          <span className="font-semibold text-foreground/80 mb-1">Cell {index + 1}</span>
                          <p className="whitespace-pre-wrap leading-snug">{cellDescription}</p>
                        </div>
                      ))}
                    </div>
                  ) : (!isLoading && <p className="text-sm text-muted-foreground">No grid cell descriptions available.</p>)}
                </div>
              </div>
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
                    <div key={index} className="p-3 border rounded-md bg-muted/50 shadow-sm">
                      <Badge variant="secondary" className="mb-1.5 text-xs">{logline.tone || `Variant ${index + 1}`}</Badge>
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
                <div className="max-h-96 overflow-y-auto border rounded-md shadow-inner">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="w-[15%] px-3 py-2 text-xs">Shot #</TableHead>
                        <TableHead className="w-[25%] px-3 py-2 text-xs">Lens</TableHead>
                        <TableHead className="w-[30%] px-3 py-2 text-xs">Camera Move</TableHead>
                        <TableHead className="w-[30%] px-3 py-2 text-xs">Framing Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedShotList.map((shot, index) => (
                        <TableRow key={index} className="hover:bg-muted/50">
                          <TableCell className="font-medium px-3 py-2 text-xs">{shot.number}</TableCell>
                          <TableCell className="px-3 py-2 text-xs">{shot.lens}</TableCell>
                          <TableCell className="px-3 py-2 text-xs">{shot.move}</TableCell>
                          <TableCell className="px-3 py-2 text-xs">{shot.framing}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (!isLoading && <p className="text-sm text-muted-foreground p-3">No shot list generated.</p>)}
            </ResultCard>

            <ResultCard
              title="Proxy Clip Animatic Description"
              icon={<Video className="h-6 w-6 text-accent" />}
              isLoading={isLoading && !results?.proxyClipAnimaticDescription}
              loadingHeight="h-40"
              className="md:col-span-2" // Allow this to span if it's the last one in a row or on its own row
            >
                {results?.proxyClipAnimaticDescription ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 border rounded-md bg-muted/50 shadow-sm">{results.proxyClipAnimaticDescription}</p>
                ) : (!isLoading && <p className="text-sm text-muted-foreground p-3">No animatic description available.</p>)}
            </ResultCard>
          </div>
          {results && !isLoading && (
            <p className="mt-8 text-xs text-muted-foreground text-center">
              AI Output Transparency: Assets generated by AI. Review and refine as needed. Use the 3x3 mood board descriptions to guide further visual development.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
