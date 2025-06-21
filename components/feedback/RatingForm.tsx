"use client";
import React, { useState, useEffect } from 'react'; // Added useEffect
import { Button } from '@/components/ui/button';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubmitRating } from '@/lib/useSubmitRating';
import type { Rating } from '@/lib/feedback-types';

// Placeholder for actual auth hook
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase/client';

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

  const { mutate: submitRating, isPending, error } = useSubmitRating();

  useEffect(() => {
    setRating(currentRating); // Sync with prop
  }, [currentRating]);

  useEffect(() => {
    const auth = getAuth(firebaseApp);
    const unsubscribe = onAuthStateChanged(auth, (user) => { // Use the existing auth instance
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
      onError: (err: Error) => {
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
        <p className="text-muted-foreground">Please <a href="#" onClick={() => signInAnonymously(getAuth(firebaseApp))} className="underline">sign in</a> to leave a rating.</p>
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
            onClick={() => !isPending && setRating(starValue)}
            onMouseEnter={() => !isPending && setHoverRating(starValue)}
            onMouseLeave={() => !isPending && setHoverRating(0)}
          />
        ))}
      </div>
      {error && <p className="text-sm text-center text-destructive">{(error as Error).message}</p>}
      <div className="flex justify-end space-x-2">
        {onCancel && !isPending && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={isPending || rating === 0}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </div>
    </div>
  );
}