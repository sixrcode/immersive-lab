
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
import { Loader2, Sparkles, FileText, ListChecks, Video, Palette, Image as ImageIcon, ClipboardSignature, XCircle, CheckCircle, Copy, Download, ThumbsUp, ThumbsDown, Share2, Eye, Printer, FileJson, MoreVertical } from "lucide-react";
import NextImage from "next/image";
import { useState, type ReactNode, useMemo, ChangeEvent, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
  contentClassName?: string;
  headerActions?: ReactNode;
}

const PLACEHOLDER_IMAGE_URL_TEXT = "Image+Gen+Failed";

const moodBoardPositionalLabels: string[] = [
    "Top-Left", "Top-Center", "Top-Right",
    "Middle-Left", "Middle-Center", "Middle-Right",
    "Bottom-Left", "Bottom-Center", "Bottom-Right"
];


function ResultCard({
  title,
  icon,
  children,
  isLoading,
  hasContentAfterLoading = true,
  noContentMessage = "No content was generated for this section.",
  loadingHeight = "h-32",
  className,
  contentClassName,
  headerActions
}: ResultCardProps) {
  return (
    <Card className={cn("shadow-lg flex flex-col print-card", className)}>
      <CardHeader className={cn("flex flex-row items-center justify-between gap-3 space-y-0 pb-2 print-card-header", headerActions ? "pr-2" : "")}>
        <div className="flex items-center gap-3">
          {icon}
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
        </div>
        {headerActions && <div className="ml-auto flex items-center gap-1 no-print">{headerActions}</div>}
      </CardHeader>
      <CardContent className={cn("flex-grow print-card-content", contentClassName)}>
        {isLoading ? (
          <Skeleton className={cn("w-full", loadingHeight)} />
        ) : !hasContentAfterLoading ? (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-sm text-muted-foreground p-3">{noContentMessage}</p>
          </div>
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
  { value: "Wes Anderson Quirk", label: "Wes Anderson Quirk" },
  { value: "Studio Ghibli Charm", label: "Studio Ghibli Charm" },
  { value: "Dark Academia", label: "Dark Academia" },
  { value: "Solarpunk Utopia", label: "Solarpunk Utopia" },
  { value: "Cosmic Horror", label: "Cosmic Horror" },
];

const sanitizePromptForFilename = (prompt: string | undefined, maxLength: number = 25): string => {
  if (!prompt || prompt.trim() === '') return 'untitled_prompt';
  const slug = prompt
    .trim()
    .toLowerCase()
    .split(' ')
    .slice(0, 5)
    .join('_')
    .replace(/[^\w_.-]/g, '')
    .replace(/__+/g, '_')
    .slice(0, maxLength);

  const cleanedSlug = slug.replace(/[_.-]+$/, '');

  return cleanedSlug || 'prompt_extract';
};


export default function PromptToPrototypePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PromptToPrototypeOutput | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
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

  const handleCopyToClipboard = async (textToCopy: string | undefined, itemName: string) => {
    if (!textToCopy) {
      toast({
        title: "Nothing to Copy",
        description: `The ${itemName} content is empty.`,
        variant: "destructive",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: `${itemName} Copied!`,
        description: `The ${itemName.toLowerCase()} has been copied to your clipboard.`,
        action: <CheckCircle className="text-green-500" />,
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Copy Failed",
        description: `Could not copy the ${itemName.toLowerCase()}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleDownloadImage = () => {
    if (results?.moodBoardImage && !isPlaceholderImage) {
      const currentPrompt = form.getValues("prompt");
      const filenameSuffix = sanitizePromptForFilename(currentPrompt);
      const link = document.createElement('a');
      link.href = results.moodBoardImage;
      link.download = `ISL_Moodboard_${filenameSuffix}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
       toast({
        title: "Image Download Started",
        description: "Your mood board image is downloading.",
      });
    } else {
      toast({
        title: "Download Failed",
        description: "No image available to download or image generation failed.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAllTextAssets = () => {
    if (results?.allTextAssetsJsonString) {
      const currentPrompt = form.getValues("prompt");
      const filenameSuffix = sanitizePromptForFilename(currentPrompt);
      const blob = new Blob([results.allTextAssetsJsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ISL_Prototype_Package_Text_Assets_${filenameSuffix}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Text Assets Download Started",
        description: "Your bundled text assets JSON file is downloading.",
      });
    } else {
      toast({
        title: "Download Failed",
        description: "No text assets available to download.",
        variant: "destructive",
      });
    }
  };


  const handleImageAction = (action: 'thumbsUp' | 'thumbsDown' | 'share') => {
    switch (action) {
      case 'thumbsUp':
        toast({ title: "Feedback Submitted (Placeholder)", description: "Thanks for the thumbs up!" });
        break;
      case 'thumbsDown':
        toast({ title: "Feedback Submitted (Placeholder)", description: "Thanks for the feedback!" });
        break;
      case 'share':
        if (results?.moodBoardImage && !isPlaceholderImage) {
            navigator.clipboard.writeText(results.moodBoardImage)
            .then(() => toast({ title: "Image Data URI Copied", description: "Image data URI copied. This is not a direct shareable link for others."}))
            .catch(() => toast({ title: "Share Failed", description: "Could not copy image data URI.", variant: "destructive" }));
        } else {
            toast({ title: "Share Failed", description: "No image to share.", variant: "destructive" });
        }
        break;
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
          number: parts[0]?.trim() || "N/A",
          lens: parts[1]?.trim() || "N/A",
          move: parts[2]?.trim() || "N/A",
          framing: parts.slice(3).join(',').trim() || "N/A",
        };
      });
  }, [results?.shotList]);

  const isPlaceholderImage = results?.moodBoardImage?.includes(PLACEHOLDER_IMAGE_URL_TEXT);

  const imageActionButtons = (isDialog: boolean = false) => (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className={cn("text-white hover:text-green-400 no-print", isDialog && "text-foreground hover:text-green-500")} onClick={() => handleImageAction('thumbsUp')} aria-label="Thumbs up image">
            <ThumbsUp className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Thumbs Up</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className={cn("text-white hover:text-red-400 no-print", isDialog && "text-foreground hover:text-red-500")} onClick={() => handleImageAction('thumbsDown')} aria-label="Thumbs down image">
            <ThumbsDown className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Thumbs Down</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className={cn("text-white hover:text-blue-400 no-print", isDialog && "text-foreground hover:text-blue-500")} onClick={handleDownloadImage} disabled={!results?.moodBoardImage || isPlaceholderImage} aria-label="Download image">
            <Download className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Download Image</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className={cn("text-white hover:text-purple-400 no-print", isDialog && "text-foreground hover:text-purple-500")} onClick={() => handleImageAction('share')} aria-label="Share image">
            <Share2 className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Share Image (Copy Data URI)</p></TooltipContent>
      </Tooltip>
    </>
  );

  const handlePrint = () => {
    window.print();
  };

  if (!mounted) {
     return (
      <div className="container mx-auto py-8" id="promptToPrototypePage">
        <Card className="max-w-6xl mx-auto shadow-xl">
           <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <Skeleton className="h-8 w-72" /> {/* Approx width of title */}
              <Skeleton className="h-4 w-96 mt-2" /> {/* Approx width of description */}
            </div>
            <div className="flex items-center gap-2 ml-auto no-print">
                <Skeleton className="h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6"> {/* Updated for single column flow */}
              {/* Input Panel Skeleton */}
              <div className="space-y-6 p-6 bg-muted/30 rounded-lg">
                <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-1/3 mt-4" /> <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-1/3 mt-4" /> <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full mt-4" />
              </div>
              {/* Mood Board Placeholder Skeleton (below input panel) */}
               <div className="print-card">
                <Skeleton className="h-10 w-1/2 mb-2" /> {/* Approx width of ResultCard title */}
                <div className="flex flex-col gap-6 flex-grow">
                    <Skeleton className="aspect-video w-full print-image"/>
                    <div className="flex-grow print-moodboard-grid-container">
                    <Skeleton className="h-6 w-1/3 mb-2" /> {/* Approx width of "Detailed Thematic Descriptions" title */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 border p-2.5 rounded-md bg-muted/10 shadow-inner print-moodboard-grid">
                        {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
                    </div>
                    </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8" id="promptToPrototypePage">
      <Card className="max-w-6xl mx-auto shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">Prompt-to-Prototype Studio</CardTitle>
            </div>
            <CardDescription>
              Enter a prompt, optionally upload an image and select a style, to generate a mood board concept, loglines, a shot list, an animatic description, and a pitch summary. Process takes up to 30-45 seconds.
            </CardDescription>
          </div>
           <div className="flex items-center gap-2 ml-auto no-print">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="More options" disabled={isLoading || !results}>
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent><p>More Options</p></TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={handleDownloadAllTextAssets} disabled={!results?.allTextAssetsJsonString}>
                  <FileJson className="mr-2 h-4 w-4" />
                  <span>Download All Text Assets</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handlePrint} disabled={!results}>
                  <Printer className="mr-2 h-4 w-4" />
                  <span>Print / Save as PDF</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                {/* Input Panel & Mood Board Output Panel (now stacked) */}
                <div className="p-6 bg-muted/30 rounded-lg no-print space-y-6"> {/* Input fields container */}
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
                            <span className="truncate max-w-[calc(100%-2rem)]">{form.watch("imageFileName")}</span>
                            <Button type="button" variant="ghost" size="icon" onClick={removeImage} disabled={isLoading} className="h-6 w-6 flex-shrink-0" aria-label="Remove uploaded image">
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
                  <Button type="submit" className="w-full" disabled={isLoading || !mounted}>
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

                {/* Mood Board Concept Output (below input panel) */}
                <div className="print-card"> {/* This div will ensure it stacks and is styled for print */}
                  { isLoading ? (
                       <ResultCard
                          title="Mood Board Concept"
                          icon={<Palette className="h-6 w-6 text-accent" />}
                          isLoading={true}
                          loadingHeight="min-h-[400px]"
                          className="print-card" 
                          contentClassName="flex flex-col"
                           headerActions={
                             <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" disabled aria-label="Download mood board image">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Download Mood Board Image</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" disabled aria-label="Copy mood board themes JSON">
                                       <Copy className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Copy Mood Board Themes JSON</p></TooltipContent>
                                </Tooltip>
                             </div>
                          }
                        >
                          <div className="flex flex-col gap-6 flex-grow">
                            <Skeleton className="aspect-video w-full print-image"/>
                            <div className="flex-grow print-moodboard-grid-container">
                              <Skeleton className="h-6 w-1/2 mb-2"/>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 border p-2.5 rounded-md bg-muted/10 shadow-inner print-moodboard-grid">
                                {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
                              </div>
                            </div>
                          </div>
                        </ResultCard>
                    ) : results ? (
                       <ResultCard
                          title="Mood Board Concept"
                          icon={<Palette className="h-6 w-6 text-accent" />}
                          isLoading={false}
                          hasContentAfterLoading={!!(results.moodBoardImage || (results.moodBoardCells && results.moodBoardCells.length > 0))}
                          noContentMessage="Mood board concept could not be generated."
                          className="print-card"
                          contentClassName="flex flex-col"
                          headerActions={
                             <div className="flex items-center gap-1">
                              {results.moodBoardImage && !isPlaceholderImage && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadImage}
                                        aria-label="Download mood board image"
                                        disabled={!results.moodBoardImage || isPlaceholderImage}
                                        className="no-print"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Download Mood Board Image</p></TooltipContent>
                                  </Tooltip>
                                )}
                                {results.moodBoardCellsJsonString && (
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopyToClipboard(results.moodBoardCellsJsonString, "Mood Board Themes JSON")}
                                        aria-label="Copy mood board themes JSON to clipboard"
                                        className="no-print"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                   </TooltipTrigger>
                                   <TooltipContent><p>Copy Mood Board Themes JSON</p></TooltipContent>
                                 </Tooltip>
                                )}
                             </div>
                          }
                        >
                          <div className="flex flex-col gap-6 flex-grow">
                             <div className="flex flex-col gap-4">
                              <div>
                                <h4 className="font-semibold text-sm text-foreground mb-2">Representative Mood Board Image:</h4>
                                {results.moodBoardImage ? (
                                  <>
                                  <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                                    <DialogTrigger asChild className="no-print">
                                      <div className="group relative aspect-video w-full overflow-hidden rounded-md border mb-2 shadow-md cursor-pointer">
                                        <NextImage
                                            src={results.moodBoardImage}
                                            alt="Generated Mood Board Representation"
                                            layout="fill"
                                            objectFit="cover"
                                            data-ai-hint="mood board concept"
                                            className="print-image"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 no-print">
                                          {imageActionButtons()}
                                          <Eye className="absolute bottom-2 right-2 h-5 w-5 text-white opacity-70 group-hover:opacity-100" />
                                        </div>
                                      </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl p-0 no-print">
                                      <DialogHeader className="p-4 pr-14">
                                        <DialogTitle>Mood Board Image</DialogTitle>
                                      </DialogHeader>
                                      <div className="relative aspect-video">
                                         <NextImage
                                            src={results.moodBoardImage}
                                            alt="Generated Mood Board Representation - Full Size"
                                            layout="fill"
                                            objectFit="contain"
                                        />
                                      </div>
                                       <div className="absolute top-4 right-14 flex items-center gap-1">
                                          {imageActionButtons(true)}
                                      </div>
                                      <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                                        <XCircle className="h-5 w-5" />
                                        <span className="sr-only">Close</span>
                                      </DialogClose>
                                    </DialogContent>
                                  </Dialog>
                                  {/* This image is for print only, to ensure it's part of the linear flow */}
                                  <div className="hidden print-block">
                                     <NextImage
                                          src={results.moodBoardImage}
                                          alt="Generated Mood Board Representation"
                                          width={500} 
                                          height={281} 
                                          objectFit="contain"
                                          className="print-image"
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

                              <div className="print-moodboard-grid-container">
                                <h4 className="font-semibold text-sm mb-2 text-foreground">Detailed Thematic Descriptions:</h4>
                                {results.moodBoardCells && results.moodBoardCells.length === 9 ? (
                                  <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 border p-2.5 rounded-md bg-muted/10 shadow-inner print-moodboard-grid">
                                      {results.moodBoardCells.map((cell, index) => (
                                        <div
                                          key={index}
                                          className="border p-3 rounded bg-card aspect-square flex flex-col justify-start items-start overflow-y-auto min-h-[120px] max-h-[200px] shadow-sm hover:shadow-md transition-shadow print-overflow-visible"
                                          aria-label={`Mood board cell: ${cell.title || moodBoardPositionalLabels[index]}`}
                                        >
                                          <span className="font-semibold text-foreground text-sm mb-1.5 block">{cell.title || moodBoardPositionalLabels[index]}</span>
                                          <div className="text-xs text-muted-foreground">
                                            <p>{cell.description}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                     <p className="mt-3 text-xs text-muted-foreground text-center no-print">
                                      Use these thematic descriptions as a detailed guide to manually create or source images for your visual mood board.
                                    </p>
                                  </>
                                ) : (<p className="text-sm text-muted-foreground">No thematic descriptions were generated.</p>)}
                              </div>
                            </div>
                          </div>
                        </ResultCard>
                    ) : (
                      mounted && (
                        <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-muted/20 min-h-[300px]">
                            <Palette size={48} className="text-muted-foreground mb-4" />
                            <h3 className="text-xl font-semibold text-muted-foreground">Your creative assets will appear here.</h3>
                            <p className="text-muted-foreground">Define your prompt and click "Generate".</p>
                        </div>
                      )
                    )}
                </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {(results && !isLoading && mounted) && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6 text-center text-foreground no-print">Other Generated Assets</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResultCard
              title="Logline Variants"
              icon={<FileText className="h-6 w-6 text-accent" />}
              isLoading={isLoading}
              hasContentAfterLoading={!!(results.loglines && results.loglines.length > 0)}
              noContentMessage="No loglines were generated for this prototype."
              loadingHeight="h-40"
              headerActions={
                results.loglinesJsonString && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyToClipboard(results.loglinesJsonString, "Loglines JSON")}
                          aria-label="Copy loglines JSON to clipboard"
                          className="no-print"
                      >
                          <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Copy Loglines JSON</p></TooltipContent>
                  </Tooltip>
                )
              }
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

            <ResultCard
              title="Shot List (6-10 shots)"
              icon={<ListChecks className="h-6 w-6 text-accent" />}
              isLoading={isLoading}
              hasContentAfterLoading={parsedShotList.length > 0}
              noContentMessage="No shot list was generated for this prototype."
              loadingHeight="h-60"
              headerActions={
                 results.shotListMarkdownString && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyToClipboard(results.shotListMarkdownString, "Shotlist Markdown")}
                            aria-label="Copy shotlist markdown to clipboard"
                            className="no-print"
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Copy Shotlist Markdown</p></TooltipContent>
                    </Tooltip>
                  )
              }
            >
              {parsedShotList.length > 0 && (
                <div className="max-h-96 overflow-y-auto border rounded-md shadow-inner print-overflow-visible">
                  <Table className="print-table">
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

            <ResultCard
              title="Proxy Clip Animatic Description"
              icon={<Video className="h-6 w-6 text-accent" />}
              isLoading={isLoading}
              hasContentAfterLoading={!!results.proxyClipAnimaticDescription}
              noContentMessage="No animatic description was generated for this prototype."
              loadingHeight="h-40"
              className="md:col-span-1"
              headerActions={
                results.proxyClipAnimaticDescription && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToClipboard(results.proxyClipAnimaticDescription, "Animatic Description")}
                        aria-label="Copy animatic description to clipboard"
                        className="no-print"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Copy Animatic Description</p></TooltipContent>
                  </Tooltip>
                )
              }
            >
                {results.proxyClipAnimaticDescription && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 border rounded-md bg-muted/50 shadow-sm">{results.proxyClipAnimaticDescription}</p>
                )}
            </ResultCard>

            <ResultCard
              title="Pitch Summary"
              icon={<ClipboardSignature className="h-6 w-6 text-accent" />}
              isLoading={isLoading}
              hasContentAfterLoading={!!results.pitchSummary}
              noContentMessage="No pitch summary was generated for this prototype."
              loadingHeight="h-40"
              className="md:col-span-1"
              headerActions={
                results.pitchSummary && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToClipboard(results.pitchSummary, "Pitch Summary")}
                        aria-label="Copy pitch summary to clipboard"
                        className="no-print"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Copy Pitch Summary</p></TooltipContent>
                  </Tooltip>
                )
              }
            >
                {results.pitchSummary && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 border rounded-md bg-muted/50 shadow-sm">{results.pitchSummary}</p>
                )}
            </ResultCard>

          </div>
          <p className="mt-8 text-xs text-muted-foreground text-center no-print">
            AI Output Transparency: Assets generated by AI. Review and refine as needed. Use the thematic descriptions to guide further visual development.
            To get a consolidated view of all generated assets for printing or saving as a PDF, please use your browser's print functionality (Ctrl+P or Cmd+P) or the "Print / Save as PDF" button above.
          </p>
        </div>
      )}
    </div>
  );
}

    

    