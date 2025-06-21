
"use client";

// import { generateStoryboard } from "@/ai/flows/storyboard-generator-flow"; // Removed direct import
// Updated import: Use StoryboardPackage and Panel from the canonical types
import type { StoryboardGeneratorInput } from "@/lib/ai-types";
import type { StoryboardPackage, Panel as StoryboardPanelType } from "packages/types/src/storyboard.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LayoutGrid, Sparkles, Film, CheckCircle, XCircle, Download, Copy } from "lucide-react";
import NextImage from "next/image";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";

// Same style presets as Prompt-to-Prototype for consistency
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
  { value: "Wes Anderson Quirk", label: "Wes Anderson Quirk" },
  { value: "Studio Ghibli Charm", label: "Studio Ghibli Charm" },
  { value: "Dark Academia", label: "Dark Academia" },
  { value: "Solarpunk Utopia", label: "Solarpunk Utopia" },
  { value: "Cosmic Horror", label: "Cosmic Horror" },
];

const sanitizeForFilename = (text: string | undefined, maxLength: number = 25): string => {
  if (!text || text.trim() === '') return 'untitled_storyboard';
  const slug = text
    .trim()
    .toLowerCase()
    .split(' ')
    .slice(0, 5)
    .join('_')
    .replace(/[^\w_.-]/g, '')
    .replace(/__+/g, '_')
    .slice(0, maxLength);
  const cleanedSlug = slug.replace(/[_.-]+$/, '');
  return cleanedSlug || 'storyboard_extract';
};

// Define the form schema locally for client-side validation
const formSchema = z.object({
  sceneDescription: z.string().min(20, "Scene description must be at least 20 characters."),
  numPanels: z.number().min(2).max(10).default(6),
  stylePreset: z.string().optional(),
});
// Infer the type for form values from the local schema
type FormValues = z.infer<typeof formSchema>;

// Placeholder function to represent getting the current user's ID token
async function getCurrentUserIdToken(): Promise<string | null> {
  console.warn("getCurrentUserIdToken: Using placeholder ID token. Real Firebase client authentication required for this to work.");
  return "dummy-placeholder-id-token"; // Replace with actual Firebase client SDK logic
}


export default function StoryboardStudioPage() {
  const [isLoading, setIsLoading] = useState(false);
  // Update results state to use StoryboardPackage
  const [results, setResults] = useState<StoryboardPackage | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<FormValues>({ // Use the locally inferred FormValues type
    resolver: zodResolver(formSchema), // Use the local formSchema
    defaultValues: {
      sceneDescription: "",
      numPanels: 6,
      stylePreset: undefined,
    },
  });

  async function onSubmit(values: FormValues) { // values are now of type FormValues
    setIsLoading(true);
    setResults(null);

    const idToken = await getCurrentUserIdToken();
    if (!idToken) {
      toast({
        title: "Authentication Error",
        description: "Could not get user token. Please ensure you are logged in.",
        variant: "destructive",
        action: <XCircle className="text-red-500" />,
      });
      setIsLoading(false);
      return;
    }

    try {
      const inputToApi: StoryboardGeneratorInput = {
        ...values,
        numPanels: Number(values.numPanels) || 6,
      };

      const response = await fetch('/api/storyboard-studio/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(inputToApi),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        const errorMessage = errorData.details || errorData.error || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      // Expecting StoryboardPackage from the API
      const output: StoryboardPackage = await response.json();
      setResults(output);
      toast({
        title: "Storyboard Generated!",
        description: "Your storyboard panels are ready below.",
        action: <CheckCircle className="text-green-500" />,
      });
    } catch (error) {
      console.error("Error generating storyboard via API:", error);
      let errorMessage = "Failed to generate storyboard. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Error Generating Storyboard",
        description: errorMessage,
        variant: "destructive",
        action: <XCircle className="text-red-500" />,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleDownloadImage = (imageUrl: string, panelNumber: number) => {
    // Use imageUrl, and check if it's a valid URL (not placeholder or empty)
    if (imageUrl && !imageUrl.includes('placehold.co') && imageUrl.startsWith('http')) {
      const sceneDesc = form.getValues("sceneDescription");
      // results.title is from StoryboardPackage, not titleSuggestion
      const filenameSuffix = sanitizeForFilename(results?.title || sceneDesc);
      const link = document.createElement('a');
      link.href = imageUrl; // Use imageUrl for download
      link.download = `ISL_Storyboard_${filenameSuffix}_Panel_${panelNumber}.png`; // Consider deriving extension from URL if possible
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: `Panel ${panelNumber} Download Started`,
        description: "Image is downloading.",
      });
    } else {
      toast({
        title: "Download Failed",
        description: "No valid image available to download for this panel.",
        variant: "destructive",
      });
    }
  };
  
  const handleCopyText = async (textToCopy: string | undefined, itemName: string) => {
    if (!textToCopy) {
      toast({ title: "Nothing to Copy", description: `${itemName} content is empty.`, variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ title: `${itemName} Copied!`, description: `${itemName} has been copied.`, action: <CheckCircle className="text-green-500" /> });
    } catch {
      toast({ title: "Copy Failed", description: `Could not copy ${itemName}. Please try again.`, variant: "destructive" });
    }
  };


  if (!mounted) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-4xl mx-auto shadow-xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8">
        <Card className="max-w-4xl mx-auto shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">AI Storyboard Studio</CardTitle>
            </div>
            <CardDescription>
              Describe your scene, choose the number of panels and an optional style, then let AI generate your storyboard.
              Generation can take up to 1-2 minutes depending on the number of panels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="sceneDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg">Scene Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., A tense chase through a neon-lit cyberpunk alleyway. Rain is pouring. The protagonist is being pursued by shadowy figures..."
                          className="min-h-[150px] resize-none bg-background"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="numPanels"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg">Number of Panels (2-10)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={2}
                            max={10}
                            className="bg-background"
                            {...field}
                            // Ensure the value passed to the form state is a number
                            onChange={event => field.onChange(parseInt(event.target.value, 10))}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stylePreset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg">Style Preset (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined} disabled={isLoading}>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Storyboard...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Storyboard
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4 text-center text-foreground">Generating your storyboard, please wait...</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(form.getValues("numPanels") || 6)].map((_, i) => (
                <Card key={i} className="shadow-md">
                  <CardHeader>
                    <Skeleton className="h-5 w-1/3" /> {/* Panel number */}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="aspect-[4/3] w-full" /> {/* Image */}
                    <Skeleton className="h-4 w-full" /> {/* Description */}
                    <Skeleton className="h-4 w-3/4" /> {/* Shot details */}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {results && !isLoading && results.panels.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-2 text-center text-foreground">
              {/* Use results.title from StoryboardPackage */}
              {results.title || "Generated Storyboard"}
            </h2>
             <p className="text-sm text-muted-foreground text-center mb-6">
              {results.panels.length} panels generated. Review and refine as needed.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Ensure panel type matches StoryboardPanelType */}
              {results.panels.map((panel: StoryboardPanelType, index: number) => (
                // Use panel.id for key if available and unique, otherwise index or panel.panelNumber
                <Card key={panel.id || index} className="flex flex-col overflow-hidden shadow-lg">
                  <CardHeader className="pb-2">
                    {/* panel.panelNumber might not exist on StoryboardPanelType, use index+1 or ensure it's added if needed */}
                    <CardTitle className="text-base font-semibold">Panel {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-3">
                    <div className="relative aspect-[4/3] w-full bg-muted rounded-md overflow-hidden border">
                      <NextImage
                        src={panel.imageURL} // Use imageURL
                        alt={panel.alt || `Storyboard Panel ${index + 1}`} // Use panel.alt
                        layout="fill"
                        objectFit="contain"
                        data-ai-hint="storyboard panel"
                      />
                      {/* Check panel.imageURL for placeholder and validity */}
                      {panel.imageURL && !panel.imageURL.includes('placehold.co') && panel.imageURL.startsWith('http') && (
                         <Tooltip>
                            <TooltipTrigger asChild>
                               <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-2 right-2 h-7 w-7 bg-black/30 text-white hover:bg-accent/80 hover:text-accent-foreground"
                                  // Pass panel.imageURL and ensure panelNumber is available or use index+1
                                  onClick={() => handleDownloadImage(panel.imageURL, (panel as any).panelNumber || index + 1)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Download Panel Image</p></TooltipContent>
                          </Tooltip>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mt-1">Description/Caption:</h4>
                      {/* Use panel.caption from StoryboardPanelType. Fallback to panel.description if migrating. */}
                      <p className="text-xs text-muted-foreground break-words">{panel.caption || (panel as any).description}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Shot Details:</h4>
                      {/* Use panel.camera from StoryboardPanelType. Fallback to panel.shotDetails if migrating. */}
                      <p className="text-xs text-muted-foreground">{panel.camera || (panel as any).shotDetails}</p>
                    </div>
                    {/* panel.dialogueOrSound might not exist on StoryboardPanelType. Check if it's part of 'caption' or another field */}
                    {(panel as any).dialogueOrSound && (
                       <div>
                        <h4 className="text-xs font-semibold text-foreground">Dialogue/Sound:</h4>
                        <p className="text-xs text-muted-foreground">{(panel as any).dialogueOrSound}</p>
                      </div>
                    )}
                  </CardContent>
                   <CardFooter className="p-3 border-t mt-auto">
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full text-xs"
                              onClick={() => {
                                const panelNumber = (panel as any).panelNumber || index + 1;
                                const description = panel.caption || (panel as any).description;
                                const shotDetails = panel.camera || (panel as any).shotDetails;
                                const dialogueOrSound = (panel as any).dialogueOrSound;
                                handleCopyText(
                                  `Panel ${panelNumber}\nDescription: ${description}\nShot Details: ${shotDetails}${dialogueOrSound ? `\nDialogue/Sound: ${dialogueOrSound}` : ''}`,
                                  `Panel ${panelNumber} Details`
                                );
                              }}
                            >
                              <Copy className="mr-1.5 h-3 w-3" /> Copy Panel Text
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Copy all text for this panel</p></TooltipContent>
                      </Tooltip>
                   </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
         {results && !isLoading && results.panels.length === 0 && (
            <div className="mt-12 text-center">
                <Film className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-lg text-muted-foreground">No storyboard panels were generated.</p>
                <p className="text-sm text-muted-foreground">Try adjusting your scene description or the number of panels.</p>
            </div>
        )}
      </div>
    </TooltipProvider>
  );
}
    
