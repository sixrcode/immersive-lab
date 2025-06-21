"use client";
import React, { useState, useEffect } from 'react'; // Added useEffect
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useSubmitComment } from '@/lib/useSubmitComment';
import type { Comment } from '@/lib/feedback-types';
// Placeholder for actual auth hook
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase/client';

interface CommentFormProps {
  projectId: string;
  onSubmitSuccess?: (comment: Comment) => void;
  onCancel?: () => void;
}

export function CommentForm({ projectId, onSubmitSuccess, onCancel }: CommentFormProps) {
  const [commentText, setCommentText] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Auth state
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Auth loading state

  // Use 'isPending' or 'status === "pending"' based on the actual UseMutationResult type
  // Check the library documentation for the exact property name (commonly isPending or isLoading in older versions)
  // Assuming 'isPending' for newer @tanstack/react-query
  const { mutate: submitComment, isPending: isLoading, error } = useSubmitComment();

  useEffect(() => {
    const auth = getAuth(firebaseApp);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe(); // Cleanup subscription
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (commentText.trim().length === 0) {
      // Error state from useMutation can be used, or a local one
      alert("Comment cannot be empty."); // Replace with better error display
      return;
    }
    if (!isAuthenticated) {
      alert("You must be logged in to comment."); // Replace
      return;
    }

    submitComment({ projectId, text: commentText }, {
      onSuccess: (data) => {
        setCommentText(''); // Clear input
        if (onSubmitSuccess) {
          onSubmitSuccess(data);
        }
      },
      onError: (err: Error) => {
        // Error is already available from `error` property of useMutation
 console.error("Submission error:", err.message);
        // alert(`Error: ${err.message}`); // Replace with better error display
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
        <p className="text-muted-foreground">Please <a href="#" onClick={() => signInAnonymously(getAuth(firebaseApp))} className="underline">sign in anonymously</a> to leave a comment.</p>
        {/* Replace href="#" with actual sign-in link or modal trigger
            For testing, added signInAnonymously. Replace with your actual sign-in flow.
        */}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div>
        <Label htmlFor={`comment-text-${projectId}`} className="sr-only">Your comment</Label>
        <Textarea
          id={`comment-text-${projectId}`}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full"
          disabled={isLoading}
        />
      </div>
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading || commentText.trim().length === 0}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
    </form>
  );
}
