"use client";
import React, { useState, useEffect } from 'react'; // Added useEffect
import { Button } from '@/components/ui/button';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubmitRating } from '@/hooks/useSubmitRating';
import type { Rating } from '@/lib/feedback-types';

// Placeholder for actual auth hook
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase/client';

interface RatingFormProps {
  projectId: string;
  currentRating?: number;
  onSubmitSuccess?: (rating: Rating) => void;
  onCancel?: () => void;
}

export function RatingForm({ projectId, currentRating = 0, onSubmitSuccess, onCancel }: RatingFormProps) {
  const [rating, setRating] = useState(currentRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Auth state
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Auth loading state

  const { mutate: submitRating, isLoading, error } = useSubmitRating();

  useEffect(() => {
    setRating(currentRating); // Sync with prop
  }, [currentRating]);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe(); // Cleanup subscription
  }, []);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a rating."); // Replace
      return;
    }
    if (!isAuthenticated) {
      alert("You must be logged in to rate."); // Replace
      return;
    }

    submitRating({ projectId, value: rating }, {
      onSuccess: (data) => {
        if (onSubmitSuccess) {
          onSubmitSuccess(data);
        }
      },
      onError: (err: any) => {
        console.error("Submission error:", err.message);
        // alert(`Error: ${err.message}`); // Replace
      }
    });
  };

  if (isAuthLoading) {
    return (
      <div className="p-4 border rounded-md bg-muted/50 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4 border rounded-md bg-muted/50">
        <p className="text-muted-foreground">Please <a href="#" onClick={() => getAuth(app).signInAnonymously()} className="underline">sign in</a> to leave a rating.</p>
         {/* Replace href="#" with actual sign-in link or modal trigger
             For testing, added signInAnonymously. Replace with your actual sign-in flow.
        */}
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-center space-x-1">
        {[1, 2, 3, 4, 5].map((starValue) => (
          <Star
            key={starValue}
            className={cn(
              "h-8 w-8 cursor-pointer transition-colors",
              (hoverRating || rating) >= starValue
                ? "text-yellow-400 fill-yellow-400"
                : "text-muted-foreground hover:text-yellow-300"
            )}
            onClick={() => !isLoading && setRating(starValue)}
            onMouseEnter={() => !isLoading && setHoverRating(starValue)}
            onMouseLeave={() => !isLoading && setHoverRating(0)}
          />
        ))}
      </div>
      {error && <p className="text-sm text-center text-destructive">{(error as Error).message}</p>}
      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={isLoading || rating === 0}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </div>
    </div>
  );
}
