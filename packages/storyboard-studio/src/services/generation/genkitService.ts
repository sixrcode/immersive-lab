// packages/storyboard-studio/src/services/generation/genkitService.ts

import {
  StoryboardPackage,
  // Panel, // No longer constructed here
  GenerateStoryboardProps as ExternalGenerateStoryboardProps, // Renaming to avoid conflict if local mocks were ever desired
  StoryboardStreamResponse
} from '../../../../types/src/storyboard.types'; // Adjust path as necessary

// Type alias for clarity, ensuring it matches what the API expects
// The API uses 'numPanels', so we align GenerateStoryboardProps here.
export interface GenerateStoryboardProps extends Omit<ExternalGenerateStoryboardProps, 'panelCount' | 'referenceImage'> {
  sceneDescription: string;
  numPanels: number; // Aligned with API endpoint's StoryboardGeneratorInputSchema
  stylePreset?: string;
  projectId: string; // Added projectId
  // referenceImage?: File | string; // referenceImage handling can be added if API supports it
}


/**
 * Calls the backend API to generate and persist a storyboard.
 *
 * @param props The properties for generating the storyboard.
 * @param idToken Firebase ID token for authorization.
 * @param onProgress A callback function to handle progress updates.
 * @returns A Promise that resolves to the complete StoryboardPackage.
 */
export const generateStoryboardWithGenkit = async (
  props: GenerateStoryboardProps,
  idToken: string, // Added idToken parameter
  onProgress?: (response: StoryboardStreamResponse) => void
): Promise<StoryboardPackage> => {
  console.log('Requesting storyboard generation from server with props:', props);

  if (onProgress) {
    onProgress({ status: 'processing', progress: 0, message: 'Sending request to server...' });
  }

  try {
    // Map props to the structure expected by the API if necessary (already aligned)
    const apiRequestBody = {
      sceneDescription: props.sceneDescription,
      numPanels: props.numPanels,
      stylePreset: props.stylePreset,
      projectId: props.projectId, // Include projectId in the API request
      // referenceImage is not handled in this version, but could be if API supports file uploads or URL references.
    };

    if (onProgress) {
      onProgress({ status: 'processing', progress: 10, message: 'Awaiting storyboard from server...' }); // Updated progress
    }

    const response = await fetch('/api/storyboard-studio/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify(apiRequestBody),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If parsing JSON fails, use status text
        errorData = { message: response.statusText };
      }
      const errorMessage = errorData?.error || errorData?.message || `API request failed with status ${response.status}`;
      console.error('Error from storyboard generation API:', response.status, errorData);
      if (onProgress) {
        onProgress({ status: 'error', message: errorMessage });
      }
      throw new Error(errorMessage);
    }

    const storyboardPackage: StoryboardPackage = await response.json();

    if (onProgress) {
      onProgress({ status: 'success', package: storyboardPackage });
    }

    console.log('Successfully received storyboard package from server:', storyboardPackage);
    return storyboardPackage;

  } catch (error: unknown) {
    console.error('Client-side error calling generation API:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred during storyboard generation.';
    if (onProgress) {
      onProgress({ status: 'error', message });
    }
    // Re-throw the error so the caller can handle it
    throw error;
  }
};

/**
 * Placeholder for a function that might enhance a scene prompt using an LLM.
 * @param currentPrompt The user's current scene prompt.
 * @returns A Promise that resolves to an enhanced prompt string.
 */
export const enhanceScenePrompt = async (currentPrompt: string): Promise<string> => {
  console.log('Simulating prompt enhancement for:', currentPrompt);
  // In a real scenario, this would call a Genkit flow with an LLM.
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
  return `Enhanced: ${currentPrompt} with more vivid details and cinematic suggestions.`;
};

// Example of how it might be used (for testing purposes, can be removed)
/*
async function testGeneration() {
  console.log('Testing storyboard generation...');
  const testProps: GenerateStoryboardProps = {
    sceneDescription: "A cat wearing a tiny hat, riding a Roomba in a sunlit living room.",
    panelCount: 3,
    stylePreset: "photorealistic"
  };

  try {
    const result = await generateStoryboardWithGenkit(testProps, (update) => {
      console.log('Progress Update:', update);
    });
    console.log('Final Storyboard Package:', result);
  } catch (error) {
    console.error('Error during test generation:', error);
  }

  const enhanced = await enhanceScenePrompt("A basic scene.");
  console.log("Enhanced prompt:", enhanced);
}
// testGeneration(); // Uncomment to run test in a Node environment if needed
*/
