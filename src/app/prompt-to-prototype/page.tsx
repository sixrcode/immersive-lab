
"use client";

import type { PromptToPrototypeInput, PromptToPrototypeOutput } from "@/ai/flows/prompt-to-prototype";
import { promptToPrototype } from "@/ai/flows/prompt-to-prototype";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles, FileText, ListChecks, Video, Palette, Image as ImageIcon, ClipboardSignature, XCircle, CheckCircle } from "lucide-react";
import NextImage from "next/image";
import { useState, type ReactNode, useMemo, ChangeEvent, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters long."),
  imageDataUri: z.string().optional(),
  imageFileName: z.string().optional(),
  stylePreset: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ResultCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  isLoading: boolean;
  hasContentAfterLoading?: boolean;
  noContentMessage?: string;
  loadingHeight?: string;
  className?: string;
}

const PLACEHOLDER_IMAGE_URL_TEXT = "Image+Gen+Failed";

function ResultCard({ 
  title, 
  icon, 
  children, 
  isLoading, 
  hasContentAfterLoading = true, 
  noContentMessage = "No content was generated for this section.",
  loadingHeight = "h-32", 
  className 
}: ResultCardProps) {
  return (
    <Card className={cn("shadow-lg flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        {icon}
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        {isLoading ? (
          <Skeleton className={cn("w-full", loadingHeight)} />
        ) : !hasContentAfterLoading ? (
          <p className="text-sm text-muted-foreground p-3 text-center">{noContentMessage}</p>
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

const stylePresets = [
  { value: "A24 Cinematic", label: "A24 Cinematic" },
  { value: "Afrofuturist Urban", label: "Afrofuturist Urban" },
  { value: "Dreamlike Sci-Fi", label: "Dreamlike Sci-Fi" },
  { value: "Teen Drama", label: "Teen Drama" },
  { value: "Gritty Noir", label: "Gritty Noir" },
  { value: "Epic Fantasy", label: "Epic Fantasy" },
  { value: "Whimsical Animation", label: "Whimsical Animation" },
  { value: "Cyberpunk Dystopian", label: "Cyberpunk Dystopian" },
  { value: "Retro 80s VHS", label: "Retro 80s VHS" },
  { value: "Nature Documentary", label: "Nature Documentary" },
];

export default function PromptToPrototypePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PromptToPrototypeOutput | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      imageDataUri: undefined,
      imageFileName: undefined,
      stylePreset: undefined,
    },
  });

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("imageDataUri", reader.result as string);
        form.setValue("imageFileName", file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    form.setValue("imageDataUri", undefined);
    form.setValue("imageFileName", undefined);
    const fileInput = document.getElementById('imageUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setResults(null);
    try {
      const input: PromptToPrototypeInput = { 
        prompt: values.prompt,
        imageDataUri: values.imageDataUri,
        stylePreset: values.stylePreset,
      };
      const output = await promptToPrototype(input);
      setResults(output);
      toast({
        title: "Prototype Generated!",
        description: "Your assets are ready below.",
        action: <CheckCircle className="text-green-500" />,
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
          framing: parts.slice(3).join(',').trim() || "",
        };
      });
  }, [results?.shotList]);

  const isPlaceholderImage = results?.moodBoardImage?.includes(PLACEHOLDER_IMAGE_URL_TEXT);

  if (!mounted) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-6xl mx-auto shadow-xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-6">
              <div className="md:col-span-2 space-y-6 p-6 bg-muted/30 rounded-lg">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-1/3 mt-4" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-1/3 mt-4" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full mt-4" />
              </div>
              <div className="md:col-span-3 flex flex-col items-center justify-center h-full p-6 border border-dashed rounded-lg bg-muted/20">
                <Skeleton className="h-12 w-12 mb-4 rounded-full" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-6xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">Prompt-to-Prototype Studio</CardTitle>
          </div>
          <CardDescription>
            Enter a prompt, optionally upload an image and select a style, to generate a mood board concept, loglines, a shot list, an animatic description, and a pitch summary. Process takes up to 30-45 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-5 gap-6">
              {/* Input Panel */}
              <div className="md:col-span-2 space-y-6 p-6 bg-muted/30 rounded-lg">
                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg">Your Creative Prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., A lone astronaut discovers a mysterious signal on a desolate Mars colony..."
                          className="min-h-[120px] resize-none bg-background"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageDataUri"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5" />Upload Image (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          id="imageUpload"
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          className="bg-background"
                          disabled={isLoading} 
                        />
                      </FormControl>
                      {form.watch("imageFileName") && (
                        <div className="mt-2 text-sm text-muted-foreground flex items-center justify-between p-2 border rounded-md bg-background">
                          <span>{form.watch("imageFileName")}</span>
                          <Button type="button" variant="ghost" size="icon" onClick={removeImage} disabled={isLoading} className="h-6 w-6">
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                      <FormDescription>An image can help guide the visual style.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="stylePreset"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg">Select Style Preset (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Choose a style..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stylePresets.map(preset => (
                            <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>The style preset influences tone and visuals.</FormDescription>
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
              </div>

              {/* Output Panel (Mood Board) */}
              <div className="md:col-span-3">
                { isLoading ? (
                     <ResultCard
                        title="Mood Board Concept"
                        icon={<Palette className="h-6 w-6 text-accent" />}
                        isLoading={true} // Always true when global isLoading is true
                        loadingHeight="h-[calc(100%-2rem)]" // Try to fill available height
                        className="h-full"
                      >
                        {/* Children will be skeletons due to isLoading=true in ResultCard */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div><Skeleton className="h-48 w-full"/></div><div><Skeleton className="h-48 w-full"/></div></div>
                      </ResultCard>
                  ) : results ? (
                     <ResultCard
                        title="Mood Board Concept"
                        icon={<Palette className="h-6 w-6 text-accent" />}
                        isLoading={false} // Not loading anymore
                        hasContentAfterLoading={!!(results.moodBoardImage || (results.moodBoardCells && results.moodBoardCells.length > 0))}
                        noContentMessage="Mood board concept could not be generated."
                        loadingHeight="h-96"
                        className="h-full"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-sm mb-2 text-foreground">Representative Mood Board Image:</h4>
                            {results.moodBoardImage ? (
                              <>
                                <div className="relative aspect-video w-full overflow-hidden rounded-md border mb-2 shadow-md">
                                  <NextImage 
                                      src={results.moodBoardImage} 
                                      alt="Generated Mood Board Representation" 
                                      layout="fill"
                                      objectFit="cover"
                                      data-ai-hint="mood board concept"
                                  />
                                </div>
                                {isPlaceholderImage && (
                                  <p className="text-xs text-muted-foreground text-center">
                                    Representative image generation failed or is unavailable. Using a placeholder.
                                  </p>
                                )}
                              </>
                            ) : ( <p className="text-sm text-muted-foreground mb-2">No representative image was generated.</p>)}
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-sm mb-2 text-foreground">Detailed 3x3 Grid Cell Descriptions:</h4>
                            {results.moodBoardCells && results.moodBoardCells.length === 9 ? (
                              <div className="grid grid-cols-3 gap-2.5 border p-2.5 rounded-md bg-muted/10 shadow-inner">
                                {results.moodBoardCells.map((cellDescription, index) => (
                                  <div 
                                    key={index} 
                                    className="border p-3 rounded text-xs text-muted-foreground bg-card aspect-square flex flex-col justify-start items-start overflow-y-auto min-h-[110px] max-h-[160px] shadow-sm hover:shadow-md transition-shadow"
                                    aria-label={`Mood board cell ${index + 1} description`}
                                  >
                                    <span className="font-semibold text-foreground/90 mb-1.5 text-[0.8rem]">Cell {index + 1}</span>
                                    <p className="whitespace-pre-wrap leading-relaxed text-[0.75rem]">{cellDescription}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (<p className="text-sm text-muted-foreground">No grid cell descriptions were generated.</p>)}
                          </div>
                        </div>
                      </ResultCard>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-6 border border-dashed rounded-lg bg-muted/20">
                        <Palette size={48} className="text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold text-muted-foreground">Your creative assets will appear here.</h3>
                        <p className="text-muted-foreground">Define your prompt and click "Generate".</p>
                    </div>
                  )
                }
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Other Generated Assets -  Only shown if results exist and not loading */}
      {(results && !isLoading) && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6 text-center text-foreground">Other Generated Assets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Loglines Card */}
            <ResultCard
              title="Logline Variants"
              icon={<FileText className="h-6 w-6 text-accent" />}
              isLoading={false} // isLoading (global) is false here
              hasContentAfterLoading={!!(results.loglines && results.loglines.length > 0)}
              noContentMessage="No loglines were generated."
              loadingHeight="h-40"
            >
              {results.loglines && results.loglines.length > 0 && (
                <div className="space-y-3">
                  {results.loglines.map((logline, index) => (
                    <div key={index} className="p-3 border rounded-md bg-muted/50 shadow-sm">
                      <Badge variant="secondary" className="mb-1.5 text-xs">{logline.tone || `Variant ${index + 1}`}</Badge>
                      <p className="text-sm text-muted-foreground">{logline.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </ResultCard>

            {/* Shot List Card */}
            <ResultCard
              title="Shot List (6-10 shots)"
              icon={<ListChecks className="h-6 w-6 text-accent" />}
              isLoading={false} // isLoading (global) is false here
              hasContentAfterLoading={parsedShotList.length > 0}
              noContentMessage="No shot list was generated."
              loadingHeight="h-60"
            >
              {parsedShotList.length > 0 && (
                <div className="max-h-96 overflow-y-auto border rounded-md shadow-inner">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
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
              )}
            </ResultCard>

            {/* Proxy Clip Animatic Description Card */}
            <ResultCard
              title="Proxy Clip Animatic Description"
              icon={<Video className="h-6 w-6 text-accent" />}
              isLoading={false} // isLoading (global) is false here
              hasContentAfterLoading={!!results.proxyClipAnimaticDescription}
              noContentMessage="No animatic description was generated."
              loadingHeight="h-40"
              className="md:col-span-1" 
            >
                {results.proxyClipAnimaticDescription && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 border rounded-md bg-muted/50 shadow-sm">{results.proxyClipAnimaticDescription}</p>
                )}
            </ResultCard>

            {/* Pitch Summary Card */}
            <ResultCard
              title="Pitch Summary"
              icon={<ClipboardSignature className="h-6 w-6 text-accent" />}
              isLoading={false} // isLoading (global) is false here
              hasContentAfterLoading={!!results.pitchSummary}
              noContentMessage="No pitch summary was generated."
              loadingHeight="h-40"
              className="md:col-span-1"
            >
                {results.pitchSummary && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 border rounded-md bg-muted/50 shadow-sm">{results.pitchSummary}</p>
                )}
            </ResultCard>

          </div>
          <p className="mt-8 text-xs text-muted-foreground text-center">
            AI Output Transparency: Assets generated by AI. Review and refine as needed. Use the 3x3 mood board descriptions to guide further visual development.
          </p>
        </div>
      )}
    </div>
  );
}
