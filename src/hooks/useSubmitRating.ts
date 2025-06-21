import { useMutation } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase/client'; // Ensure 'app' is exported from client Firebase setup
import type { Rating } from '@/lib/feedback-types';

// Define the input type for the hook
export type SubmitRatingHookInput = Pick<Rating, 'projectId' | 'value'>;

const mutationFn = async (ratingInput: SubmitRatingHookInput) => {
  const auth = getAuth(app);
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('User not authenticated. Cannot submit rating.');
  }

  const idToken = await currentUser.getIdToken(true);

  const response = await fetch('/api/feedback/rating', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(ratingInput),
  });

  const responseData = await response.json();

  if (!response.ok || !responseData.success) {
    throw new Error(responseData.error?.message || `Failed to submit rating. Status: ${response.status}`);
  }

  // The rating API might return the new individual rating, or the updated aggregated rating.
  // Adjust the return type based on your API's actual response.
  // For now, let's assume it returns the individual rating that was created.
  return responseData.data as Rating;
};

export const useSubmitRating = () => {
  return useMutation({
    mutationFn,
    // Example:
    // onSuccess: (data) => {
    //   console.log('Rating submitted successfully:', data);
    //   // queryClient.invalidateQueries(['ratings', data.projectId]); // Example invalidation
    //   // queryClient.invalidateQueries(['aggregatedRating', data.projectId]);
    // },
    // onError: (error: Error) => {
    //   console.error('Error submitting rating:', error.message);
    // },
  });
};
