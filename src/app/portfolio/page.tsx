
"use client";

import type { PortfolioItemType } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Film, PlayCircle, Share2, CalendarDays, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const mockPortfolioItems: PortfolioItemType[] = [
  {
    id: "item1",
    title: "Ephemeral Echoes",
    description: "A short sci-fi drama about memory and loss in a futuristic city. Explores themes of identity and connection.",
    imageUrl: "https://placehold.co/600x900.png",
    dataAiHint: "sci-fi movie poster",
    videoUrl: "#",
    tags: ["Sci-Fi", "Drama", "Short Film"],
    category: "Short Film",
    duration: "12 min",
    datePublished: "2024-05-20"
  },
  {
    id: "item2",
    title: "The Last Pixel",
    description: "An animated adventure of a lone pixel trying to find its place in a vast digital world. A tale of courage and belonging.",
    imageUrl: "https://placehold.co/600x900.png",
    dataAiHint: "animation movie poster",
    videoUrl: "#",
    tags: ["Animation", "Adventure", "Family"],
    category: "Animated Short",
    duration: "8 min",
    datePublished: "2024-03-10"
  },
  {
    id: "item3",
    title: "Market Melodies",
    description: "A vibrant microdrama series following the intertwined lives of vendors at a bustling city market. Each episode is a snapshot of life.",
    imageUrl: "https://placehold.co/600x900.png",
    dataAiHint: "drama series poster",
    videoUrl: "#",
    tags: ["Microdrama", "Series", "Urban Life"],
    category: "Microdrama Series",
    duration: "6 Episodes (3 min each)",
    datePublished: "2023-11-01"
  },
   {
    id: "item4",
    title: "Concrete Canvas",
    description: "A documentary exploring the street art scene and its impact on urban culture and community voice.",
    imageUrl: "https://placehold.co/600x900.png",
    dataAiHint: "documentary poster art",
    videoUrl: "#",
    tags: ["Documentary", "Art", "Urban Culture"],
    category: "Documentary",
    duration: "25 min",
    datePublished: "2024-01-15"
  },
];

function PortfolioCard({ item }: { item: PortfolioItemType }) {
  return (
    <Card className="overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col h-full">
      <div className="relative w-full aspect-[2/3]"> {/* Aspect ratio for vertical reel look */}
        <Image 
          src={item.imageUrl} 
          alt={item.title} 
          layout="fill" 
          objectFit="cover"
          data-ai-hint={item.dataAiHint} 
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
                <span>{item.datePublished || "N/A"}</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {mockPortfolioItems.map((item) => (
          <PortfolioCard key={item.id} item={item} />
        ))}
      </div>
      
      {mockPortfolioItems.length === 0 && (
         <div className="text-center py-12">
            <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">No portfolio items to display yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Start creating and publish your work to showcase it here!</p>
         </div>
      )}
    </div>
  );
}
