
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Edit, Share2 } from "lucide-react";
import Image from "next/image";

export default function CollaborationPage() {
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto shadow-xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-8">
          <div className="flex items-center gap-3">
            <Users className="h-10 w-10" />
            <div>
              <CardTitle className="text-3xl">Real-Time Collaboration Hub</CardTitle>
              <CardDescription className="text-primary-foreground/80 text-lg mt-1">
                Work together seamlessly with your team.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="relative aspect-video mb-8 rounded-lg overflow-hidden border shadow-inner">
             <Image 
              src="https://placehold.co/800x450.png" 
              alt="Collaboration illustration" 
              layout="fill" 
              objectFit="cover" 
              data-ai-hint="team collaboration"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent flex items-center justify-center">
              <p className="text-2xl font-semibold text-white bg-black/50 px-4 py-2 rounded">Coming Soon!</p>
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground mb-6">
            Our real-time collaboration features are currently under development. Soon, you&apos;ll be able to:
          </p>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <MessageSquare className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground">Live Chat & Discussions</h3>
                <p className="text-muted-foreground text-sm">Communicate instantly with your team members within projects.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Edit className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground">Simultaneous Document Editing</h3>
                <p className="text-muted-foreground text-sm">Co-edit scripts, storyboards, and notes with multi-cursor support.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Share2 className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground">Shared Project Spaces</h3>
                <p className="text-muted-foreground text-sm">Organize all your collaborative efforts in one central place.</p>
              </div>
            </li>
          </ul>
          <p className="mt-8 text-center text-foreground font-medium">
            We&apos;re excited to bring these powerful tools to CineVision Studio to help you create amazing stories together!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
