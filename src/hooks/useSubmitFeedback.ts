import { useMutation } from '@tanstack/react-query';
import { FeedbackReport } from '@/lib/feedback-types';
import { getAuth, User } from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase/client'; // Corrected import name
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

export type SubmitFeedbackHookInput = Pick<
  FeedbackReport,
  'prototypeId' | 'reportedContentPath' | 'reason'
> & {
  category?: FeedbackReport['category'];
};

// It's better to define mutationFn outside if it doesn't need to be recreated on every hook call,
// or pass signOutUser directly if the hook's structure allows.
// For simplicity here, we'll call useAuth inside the hook, which means mutationFn is redefined.
// A more optimized approach might involve a stable signOutUser reference.

export const useSubmitFeedback = () => {
  const { signOutUser, currentUser } = useAuth(); // Get signOutUser and currentUser from context

  const mutationFnWithAuthHandling = async (feedbackInput: SubmitFeedbackHookInput) => {
    // currentUser from context is preferred over getAuth().currentUser for consistency with AuthProvider state
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
      if (response.status === 401 || response.status === 403) {
        // Token is invalid or expired, sign out user
        await signOutUser();
        // Error will still be thrown, but user is now logged out
        // The component using this hook or a global error boundary should handle the redirect
        // or the signOutUser itself (which now includes router.push) will handle it.
      }
      const errorData = await response.json().catch(() => ({ message: 'Failed to submit feedback. Unknown error.' }));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  };

  return useMutation({
    mutationFn: mutationFnWithAuthHandling,
  });
};
