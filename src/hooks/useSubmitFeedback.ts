import { useMutation } from '@tanstack/react-query';
import { FeedbackReport } from '@/lib/feedback-types'; // Assuming FeedbackReport is the main type
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase/client'; // Ensure 'app' is exported from client Firebase setup

// Define the input type for the hook, omitting server-set fields
export type SubmitFeedbackHookInput = Pick<
  FeedbackReport,
  'prototypeId' | 'reportedContentPath' | 'reason'
> & {
  category?: FeedbackReport['category']; // Optional category
};

const mutationFn = async (feedbackInput: SubmitFeedbackHookInput) => {
  const auth = getAuth(app);
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('User not authenticated. Cannot submit feedback.');
  }

  const idToken = await currentUser.getIdToken();

  const response = await fetch('/api/feedback/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(feedbackInput),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to submit feedback. Unknown error.' }));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
};

export const useSubmitFeedback = () => {
  return useMutation({
    mutationFn,
    // onSuccess, onError, etc. can be handled by the component using the hook
  });
};
