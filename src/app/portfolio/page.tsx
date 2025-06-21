
"use client";
import { useEffect, useState, useCallback } from "react";
import type { PortfolioItemType } from "@/lib/types";
import Image from "next/image";
import { Film, PlayCircle, Share2, CalendarDays, Clock, MessageSquare, Star, ThumbsUp, Loader2, AlertTriangle } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommentForm } from "@/components/feedback/CommentForm";
import { RatingForm } from "@/components/feedback/RatingForm";
import type { Comment as CommentType, Rating as RatingType } from "@/lib/feedback-types"; // Import feedback types
import { cn } from "@/lib/utils";
// Placeholder for auth - replace with your actual auth context or hook
// import { useAuth } from "@/hooks/useAuth"; // Example: const { user } = useAuth();

interface ProjectFeedback {
  comments: CommentType[];
  ratings: { averageRating: number; ratingCount: number; currentUserRating?: number }; // Include currentUserRating
}

interface PortfolioCardProps {
  item: PortfolioItemType;
  feedback: ProjectFeedback | null;
  onCommentSubmit: (projectId: string, comment: CommentType) => void;
  onRatingSubmit: (projectId: string, rating: RatingType) => void;
  isLoadingFeedback: boolean;
  // user: any; // Replace 'any' with your actual user type
}

function PortfolioCard({ item, feedback, onCommentSubmit, onRatingSubmit, isLoadingFeedback }: PortfolioCardProps) {
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);

  // Placeholder: Get current user. Replace with your actual authentication logic.
  // const { user } = useAuth(); // Example
  const user = { uid: "test-user-id" }; // REMOVE THIS: Replace with actual user from auth

  const handleCommentSuccess = (newComment: CommentType) => {
    onCommentSubmit(item.id, newComment);
    setShowCommentForm(false);
  };

  const handleRatingSuccess = (newRating: RatingType) => {
    onRatingSubmit(item.id, newRating);
    setShowRatingForm(false);
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return (
      <>
        {[...Array(fullStars)].map((_, i) => <Star key={`full-${i}`} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}
        {halfStar && <Star key="half" className="h-4 w-4 text-yellow-400" />} {/* Basic half star, could be improved */}
        {[...Array(emptyStars)].map((_, i) => <Star key={`empty-${i}`} className="h-4 w-4 text-muted-foreground" />)}
      </>
    );
  };


  return (
    <Card className="overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col h-full">
      <div className="relative w-full aspect-[2/3]">
        <Image
          src={item.imageUrl || "https://placehold.co/600x900.png"}
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

        {/* Feedback Display and Forms */}
        <Separator className="my-3" />
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {isLoadingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : renderStars(feedback?.ratings.averageRating || 0)}
              </div>
              <span>({feedback?.ratings.ratingCount || 0} ratings)</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{feedback?.comments.length || 0} comments</span>
            </div>
          </div>

          {user && ( // Only show buttons if user is logged in
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCommentForm(!showCommentForm)} className="flex-1">
                <MessageSquare className="h-4 w-4 mr-1.5" /> {showCommentForm ? "Cancel" : "Comment"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowRatingForm(!showRatingForm)} className="flex-1">
                <Star className="h-4 w-4 mr-1.5" /> {showRatingForm ? "Cancel" : (feedback?.ratings.currentUserRating ? "Update Rating" : "Rate")}
              </Button>
            </div>
          )}

          {showCommentForm && user && (
            <CommentForm
              projectId={item.id}
              onSubmitSuccess={handleCommentSuccess}
              onCancel={() => setShowCommentForm(false)}
            />
          )}
          {showRatingForm && user && (
            <RatingForm
              projectId={item.id}
              currentRating={feedback?.ratings.currentUserRating}
              onSubmitSuccess={handleRatingSuccess}
              onCancel={() => setShowRatingForm(false)}
            />
          )}

          {/* Display Comments */}
          {feedback && feedback.comments.length > 0 && (
            <div className="space-y-2 pt-2 max-h-40 overflow-y-auto">
              <h4 className="text-sm font-medium">Comments:</h4>
              {feedback.comments.slice(0,3).map(comment => ( // Show initial few comments
                <div key={comment.id} className="text-xs p-2 bg-muted/50 rounded-md">
                  <p className="font-semibold">User {comment.userId.substring(0,6)}... <span className="text-muted-foreground text-xs ml-1">({new Date(comment.timestamp).toLocaleDateString()})</span></p>
                  <p>{comment.text}</p>
                </div>
              ))}
              {feedback.comments.length > 3 && <Button variant="link" size="sm" className="p-0 h-auto text-xs">View all comments</Button> }
            </div>
          )}
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="p-4 bg-muted/30">
        <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
            <div className="flex items-center gap-1"> <CalendarDays className="h-3.5 w-3.5" /> <span>{item.datePublished}</span> </div>
            <div className="flex items-center gap-1"> <Clock className="h-3.5 w-3.5" /> <span>{item.duration || "N/A"}</span> </div>
            <Button variant="ghost" size="sm" className="text-xs p-1 h-auto"> <Share2 className="h-3.5 w-3.5 mr-1" /> Share </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function PortfolioPage() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItemType[]>([]);
  const [feedbacks, setFeedbacks] = useState<Record<string, ProjectFeedback>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFeedbackGlobal, setIsLoadingFeedbackGlobal] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Placeholder: Get current user. Replace with your actual authentication logic.
  // const { user, loading: authLoading, getIdToken } = useAuth(); // Example
  const user = { uid: "test-user-id", idToken: "dummy-token" }; // REMOVE THIS: Replace with actual user from auth
  // const idToken = user?.idToken; // Or however you get the token

  const fetchFeedbackForItem = useCallback(async (itemId: string, token: string | null) => {
    if (!itemId) return null;
    setIsLoadingFeedbackGlobal(prev => ({ ...prev, [itemId]: true }));
    try {
      const [commentsRes, ratingsRes] = await Promise.all([
        fetch(`/api/feedback/comments?projectId=${itemId}`),
        fetch(`/api/feedback/ratings?projectId=${itemId}`),
      ]);

      if (!commentsRes.ok || !ratingsRes.ok) {
        console.error(`Failed to fetch feedback for ${itemId}`);
        return null;
      }

      const commentsData = await commentsRes.json();
      const ratingsData = await ratingsRes.json();

      // Check if user has rated this project - this would ideally come from ratings API or a separate user-specific ratings fetch
      // For now, this is a placeholder.
      let currentUserRating: number | undefined = undefined;
      // Example: if you fetched individual ratings and user's own rating is among them
      // const userRatingDoc = ratingsData.data.individualRatings?.find(r => r.userId === user?.uid);
      // if (userRatingDoc) currentUserRating = userRatingDoc.value;


      return {
        comments: commentsData.success ? commentsData.data : [],
        ratings: ratingsData.success ? { ...ratingsData.data, currentUserRating } : { averageRating: 0, ratingCount: 0, currentUserRating },
      };
    } catch (e) {
      console.error(`Error fetching feedback for ${itemId}:`, e);
      return null;
    } finally {
      setIsLoadingFeedbackGlobal(prev => ({ ...prev, [itemId]: false }));
    }
  }, []);

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
        const rawItems: unknown[] = await response.json();

        const transformedItems: PortfolioItemType[] = rawItems.map((rawItem: unknown): PortfolioItemType => {
          if (typeof rawItem !== 'object' || rawItem === null) {
            console.error("Invalid raw item received:", rawItem);
            return { id: uuidv4(), title: "Invalid Item", description: "This item was not processed correctly.", category: "Error", imageUrl: "https://placehold.co/600x900.png", datePublished: "N/A", tags: [] };
          }
          const item = rawItem as Record<string, unknown>;
          return {
            id: item._id || item.id || uuidv4(),
            title: item.title || "Untitled Project",
            description: item.description || "No description available.",
            category: item.category || "General",
            imageUrl: item.imageUrl || "https://placehold.co/600x900.png",
            datePublished: item.datePublished ? new Date(item.datePublished as string).toISOString().split('T')[0] : "N/A",
            duration: item.duration || "N/A",
            tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
            videoUrl: typeof item.videoUrl === 'string' ? item.videoUrl : undefined,
            client: typeof item.client === 'string' ? item.client : undefined,
            role: typeof item.role === 'string' ? item.role : undefined,
            softwareUsed: Array.isArray(item.softwareUsed) ? item.softwareUsed.map(String) : [],
            dataAiHint: typeof item.dataAiHint === 'string' ? item.dataAiHint : undefined,
          };
        });
        setPortfolioItems(transformedItems);

        // Fetch feedback for all items
        // In a real app, ensure you have the user's ID token if required by fetchFeedbackForItem
        const idToken = user?.idToken; // Get token from your auth state
        const feedbackPromises = transformedItems.map(item => fetchFeedbackForItem(item.id, idToken || null));
        const feedbackResults = await Promise.all(feedbackPromises);

        const newFeedbacks: Record<string, ProjectFeedback> = {};
        transformedItems.forEach((item, index) => {
          if (feedbackResults[index]) {
            newFeedbacks[item.id] = feedbackResults[index] as ProjectFeedback;
          }
        });
        setFeedbacks(newFeedbacks);

      } catch (e: unknown) {
        console.error("Failed to fetch portfolio items:", e);
        setError(e instanceof Error ? e.message : "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPortfolioItems();
  }, [fetchFeedbackForItem, user]); // Add user to dependency array if its change should trigger re-fetch

  const handleCommentSubmit = (projectId: string, newComment: CommentType) => {
    setFeedbacks(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        comments: [newComment, ...(prev[projectId]?.comments || [])],
      },
    }));
    // Optionally, re-fetch all feedback for this item to get the most up-to-date state from server
    // fetchFeedbackForItem(projectId, user?.idToken || null).then(updatedFeedback => {
    //   if (updatedFeedback) setFeedbacks(prev => ({ ...prev, [projectId]: updatedFeedback }));
    // });
  };

  const handleRatingSubmit = async (projectId: string, newRating: RatingType) => {
    // Optimistically update UI, then re-fetch for consistency
    // Or, the API could return the new aggregated rating
    const idToken = user?.idToken; // Get token from your auth state
    const updatedFeedback = await fetchFeedbackForItem(projectId, idToken || null);
    if (updatedFeedback) {
      setFeedbacks(prev => ({ ...prev, [projectId]: updatedFeedback }));
    }
  };

  if (isLoading && portfolioItems.length === 0) { // Check portfolioItems.length to avoid flicker if only feedback is loading
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
        <Button onClick={() => window.location.reload()} className="mt-6" variant="outline"> Try Again </Button>
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
            <PortfolioCard
              key={item.id}
              item={item}
              feedback={feedbacks[item.id] || null}
              onCommentSubmit={handleCommentSubmit}
              onRatingSubmit={handleRatingSubmit}
              isLoadingFeedback={isLoadingFeedbackGlobal[item.id] || false}
              // user={user} // Pass user if PortfolioCard needs it directly
            />
          ))}
        </div>
      ) : (
         <div className="text-center py-12 col-span-full">
            <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">No portfolio items to display yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Check back later or be the first to add a project!</p>
         </div>
      )}
    </div>
  );
}
