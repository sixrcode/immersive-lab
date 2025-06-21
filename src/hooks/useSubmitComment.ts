import { useMutation } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase/client'; // Ensure 'app' is exported from client Firebase setup
import type { Comment } from '@/lib/feedback-types';

// Define the input type for the hook, omitting server-set fields like id, userId, timestamp
export type SubmitCommentHookInput = Pick<Comment, 'projectId' | 'text'>;

const mutationFn = async (commentInput: SubmitCommentHookInput) => {
  const auth = getAuth(app);
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('User not authenticated. Cannot submit comment.');
  }

  // It's good practice to get a fresh token before each authenticated API call.
  const idToken = await currentUser.getIdToken(true);

  const response = await fetch('/api/feedback/comment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(commentInput),
  });

  const responseData = await response.json();

  if (!response.ok || !responseData.success) {
    throw new Error(responseData.error?.message || `Failed to submit comment. Status: ${response.status}`);
  }

  return responseData.data as Comment; // Assuming the API returns the created comment
};

export const useSubmitComment = () => {
  return useMutation({
    mutationFn,
    // onSuccess, onError, onMutate etc. can be handled by the component using the hook
    // or defined globally here if needed.
    // Example:
    // onSuccess: (data) => {
    //   console.log('Comment submitted successfully:', data);
    //   // queryClient.invalidateQueries(['comments', data.projectId]); // Example invalidation
    // },
    // onError: (error: Error) => {
    //   console.error('Error submitting comment:', error.message);
    // },
  });
};
