
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Film, Kanban, ScanText, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image"; 
import { useState, useEffect } from "react";

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  baseImgSrc: string; 
  aiHint: string;
  generatedImgSrc?: string | null; 
}

const initialFeaturesData: Omit<Feature, 'generatedImgSrc'>[] = [
  {
    title: "Prompt to Prototype",
    description: "Turn your ideas into visual concepts, loglines, and shot lists instantly.",
    icon: Sparkles,
    href: "/prompt-to-prototype",
    baseImgSrc: "https://placehold.co/600x400.png",
    aiHint: "creative ideas",
  },
  {
    title: "AI Script Analyzer",
    description: "Get in-depth analysis of your scripts for clarity, tone, and impact.",
    icon: ScanText,
    href: "/script-analyzer",
    baseImgSrc: "https://placehold.co/600x400.png",
    aiHint: "script analysis",
  },
  {
    title: "Production Board",
    description: "Manage your projects with a visual Kanban board from pitch to final cut.",
    icon: Kanban,
    href: "/production-board",
    baseImgSrc: "https://placehold.co/600x400.png",
    aiHint: "project management",
  },
  {
    title: "Portfolio Showcase",
    description: "Display your finished projects in a stunning vertical reel format.",
    icon: Film,
    href: "/portfolio",
    baseImgSrc: "https://placehold.co/600x400.png",
    aiHint: "film portfolio",
  },
];

export default function DashboardPage() {
  const [features, setFeatures] = useState<Feature[]>(() =>
    initialFeaturesData.map(f => ({ ...f, generatedImgSrc: f.baseImgSrc }))
  );

  useEffect(() => {
    let isMounted = true;

    const generateAllImages = async () => {
      const updatedFeaturesList = await Promise.all(
        initialFeaturesData.map(async (featureData) => {
          let newImgSrc = featureData.baseImgSrc; 
          try {
            // SIMULATED AI IMAGE GENERATION:
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000)); // Simulate network delay
            const keywords = featureData.aiHint.split(" ").slice(0, 2).join("+"); 
            const titleAbbreviation = featureData.title.split(" ").map(word => word[0]).join("").toUpperCase();
            newImgSrc = `https://placehold.co/600x400.png?text=${titleAbbreviation}+${keywords}`;
            // End of simulated AI call

          } catch (error) {
            console.error(`Failed to generate image for ${featureData.title}:`, error);
          }
          if (!isMounted) return { ...featureData, generatedImgSrc: featureData.baseImgSrc }; 
          return { ...featureData, generatedImgSrc: newImgSrc };
        })
      );

      if (isMounted) {
        setFeatures(updatedFeaturesList);
      }
    };

    generateAllImages();
    
    return () => {
      isMounted = false; 
    };
  }, []); 

  return (
    <div className="flex flex-col gap-8">
      <header className="py-8 bg-gradient-to-r from-primary/10 via-background to-background rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Welcome to the Immersive Storytelling Lab</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Your AI-powered co-pilot for cinematic expression. Let&apos;s create something amazing.
        </p>
      </header>

      <section>
        <h2 className="text-2xl font-semibold mb-6 text-foreground">Explore Core Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="flex flex-col overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="relative h-48 p-0">
                <NextImage 
                  src={feature.generatedImgSrc || feature.baseImgSrc} 
                  alt={feature.title} 
                  layout="fill" 
                  objectFit="cover" 
                  data-ai-hint={feature.aiHint}
                  unoptimized={!!(feature.generatedImgSrc && feature.generatedImgSrc.startsWith('data:'))} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4">
                   <feature.icon className="h-10 w-10 text-accent mb-2" />
                  <CardTitle className="text-2xl text-white">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-grow pt-6">
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
              <CardFooter>
                <Link href={feature.href} passHref legacyBehavior>
                  <Button variant="default" className="w-full bg-primary hover:bg-primary/90">
                    Go to {feature.title} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

       <section className="mt-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">About SIXR & Mervyn Seldon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <div className="mb-4">
              <NextImage
                src="/images/sixr-logo.png" 
                alt="SIXR Logo"
                width={120} 
                height={120}  
                data-ai-hint="SIXR logo" 
                className="rounded-md shadow-sm"
              />
            </div>
            <p>
              SIXR, a 501(c)3 organization, is dedicated to bringing emerging technology education to marginalized communities.
              Immersive Storytelling Lab (ISL) is inspired by the legacy of Mervyn Winston Adams Seldon (1932–2023),
              an artist and educator committed to making art accessible.
            </p>
            <p>
              This platform aims to embody Mervyn&apos;s vision by empowering the next generation of creators through innovative tools and collaborative learning.
            </p>
             <Button variant="link" asChild className="px-0">
              <a href="https://sixr.org" target="_blank" rel="noopener noreferrer">
                Learn more about SIXR <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
    
