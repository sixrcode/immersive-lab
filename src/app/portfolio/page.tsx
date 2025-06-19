
"use client";
import { useEffect, useState } from "react";
import type { PortfolioItemType } from "@/lib/types";
import Image from "next/image";
import { Film, PlayCircle, Share2, CalendarDays, Clock, Loader2, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
// mockPortfolioItems array removed
import { Button } from "@/components/ui/button"; // Correct import
import { Badge } from "@/components/ui/badge";   // Correct import

function PortfolioCard({ item }: { item: PortfolioItemType }) {
  return (
    <Card className="overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col h-full">
      <div className="relative w-full aspect-[2/3]"> {/* Aspect ratio for vertical reel look */}
        <Image
          src={item.imageUrl || "https://placehold.co/600x900.png"} // Fallback image
          alt={item.title}
          fill
          className="object-cover"
          data-ai-hint={item.dataAiHint}
  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4">
          <CardTitle className="text-2xl font-bold text-white drop-shadow-md">{item.title}</CardTitle>
          <Badge variant="secondary" className="mt-1 bg-accent/80 text-accent-foreground backdrop-blur-sm">{item.category}</Badge>
        </div>
         {item.videoUrl && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Button variant="ghost" size="icon" className="h-16 w-16 bg-black/30 hover:bg-accent/80 text-white hover:text-accent-foreground rounded-full backdrop-blur-sm">
              <PlayCircle className="h-10 w-10" />
            </Button>
          </div>
        )}
      </div>
      <CardContent className="p-4 flex-grow">
        <CardDescription className="text-sm text-muted-foreground mb-3 line-clamp-3">{item.description}</CardDescription>
        <div className="flex flex-wrap gap-2 mb-3">
          {item.tags?.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="p-4 bg-muted/30">
        <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {/* Assuming datePublished is already a formatted string or "N/A" from fetch logic */}
                <span>{item.datePublished}</span>
            </div>
            <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{item.duration || "N/A"}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-xs p-1 h-auto">
                <Share2 className="h-3.5 w-3.5 mr-1" /> Share
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function PortfolioPage() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolioItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_PORTFOLIO_API_URL || "http://localhost:3001/portfolio";
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        let data = await response.json();
        // Map _id to id for frontend consistency if PortfolioItemType expects 'id'
        // Also ensure all essential fields for PortfolioCard are present, providing fallbacks if necessary.
        data = data.map((item: Record<string, any>) => ({
 // Explicitly cast item to PortfolioItemType
          ...item,
          id: item._id || item.id, // Use _id from mongo, or id if already present
          imageUrl: item.imageUrl || "https://placehold.co/600x900.png", // Fallback image
          // Ensure datePublished is a string or can be parsed by Date constructor in PortfolioCard
          datePublished: item.datePublished ? new Date(item.datePublished).toISOString().split('T')[0] : "N/A",
        }));
        setPortfolioItems(data);
      } catch (e: unknown) {
        console.error("Failed to fetch portfolio items:", e);
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError("An unexpected error occurred. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolioItems();
  }, []); // Empty dependency array means this effect runs once on mount

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-xl text-muted-foreground">Loading portfolio items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <p className="text-xl font-semibold text-destructive">Error Loading Portfolio</p>
        <p className="text-md text-muted-foreground max-w-md">{error}</p>
        <Button
          onClick={() => {
            // Simple reload to retry. For a better UX, abstract fetchPortfolioItems and call it here.
            window.location.reload();
          }}
          className="mt-6"
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <header className="mb-10 text-center">
        <div className="inline-flex items-center gap-3 mb-2">
            <Film className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Creator Portfolios</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover stunning projects and vertical reels from our talented community of filmmakers and storytellers.
        </p>
      </header>

      {portfolioItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {portfolioItems.map((item) => (
            // Ensure key is unique, using item.id (which should be mapped from _id)
            <PortfolioCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
         <div className="text-center py-12 col-span-full"> {/* Ensure this message spans full width if grid is active */}
            <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">No portfolio items to display yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Check back later or be the first to add a project!</p>
         </div>
      )}
    </div>
  );
}
