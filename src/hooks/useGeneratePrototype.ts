import { useMutation } from "@tanstack/react-query";
import type { PromptPackage as PromptPackageAPIOutput } from "@/lib/types"; // API output type from the backend
import type { PromptToPrototypeInput } from "@/lib/types"; // Structure for the API request body

/**
 * @fileoverview Custom React Query hook (`useGeneratePrototype`) for generating prototype assets.
 *
 * This hook encapsulates the logic for:
 * 1. Preparing the request payload for the `/api/prototype/generate` endpoint.
 * 2. Making a POST request to the endpoint.
 * 3. Handling the response (success or error) from the API.
 *
 * It uses `@tanstack/react-query`'s `useMutation` for managing the asynchronous data fetching
 * and state (loading, error, success).
 */

/**
 * Defines the input structure for the `useGeneratePrototype` hook.
 * This is the data that the UI component will pass when calling the mutation function.
 */
export interface GeneratePrototypeHookInput {
  inputs: {
    prompt: string; // The main textual prompt for generation.
    params?: Record<string, unknown>; // Additional parameters, not directly used by this hook's transformation logic but available.
  }[];
  params?: {
    imageDataUri?: string; // Optional base64 encoded image data URI.
    stylePreset?: string;  // Optional style preset for generation.
    // Allows other parameters that might not be directly used by the API call
    // but could be part of the hook's input for other reasons or future use.
    [key: string]: unknown;
  };
}

/**
 * Custom hook `useGeneratePrototype`.
 *
 * @returns {object} A TanStack Query `useMutation` object with methods like `mutate`, `mutateAsync`,
 *                   and states like `isPending`, `isError`, `isSuccess`, `data`, `error`.
 */
export const useGeneratePrototype = () => {
  // useMutation<TData, TError, TVariables, TContext>
  // - TData: Type of the data returned by the mutationFn (PromptPackageAPIOutput).
  // - TError: Type of the error thrown by the mutationFn (Error).
  // - TVariables: Type of the input variables passed to the mutationFn (GeneratePrototypeHookInput).
  return useMutation<PromptPackageAPIOutput, Error, GeneratePrototypeHookInput>({
    /**
     * The asynchronous function that performs the mutation (API call).
     * @param {GeneratePrototypeHookInput} hookInput - The input data provided by the component.
     * @returns {Promise<PromptPackageAPIOutput>} A promise that resolves to the generated PromptPackage.
     * @throws {Error} If the API call fails or returns an unexpected response.
     */
    mutationFn: async (hookInput) => {
      // 1. Transform the hook's input (`hookInput`) into the structure
      //    expected by the `/api/prototype/generate` endpoint (`apiRequestBody`).
      if (!hookInput.inputs || hookInput.inputs.length === 0 || !hookInput.inputs[0].prompt) {
        throw new Error("No prompt provided in hook input. The 'inputs' array must contain at least one item with a 'prompt' string.");
      }

      // Construct the payload for the API request.
      // This structure should match the `PromptToPrototypeInputSchema` used by the API route.
      const apiRequestBody: PromptToPrototypeInput = {
        prompt: hookInput.inputs[0].prompt, // Use the first prompt from the inputs array.
        imageDataUri: hookInput.params?.imageDataUri, // Pass along if provided.
        stylePreset: hookInput.params?.stylePreset,   // Pass along if provided.
      };

      // 2. Make the POST request to the backend API.
      const response = await fetch("/api/prototype/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiRequestBody),
      });

      // 3. Handle the API response.
      if (!response.ok) {
        // If the response status is not OK (e.g., 4xx, 5xx), attempt to parse
        // an error message from the response body and throw an error.
        let errorDetails = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json(); // Assuming error response is JSON
            errorDetails = errorData.error || errorData.details || errorDetails;
        } catch (e) {
            // If parsing the error JSON fails, use the basic HTTP error status.
            console.warn("Could not parse error JSON from API response:", e);
        }
        throw new Error(errorDetails);
      }

      // Check if the response content type is JSON.
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Received non-JSON response from server:", await response.text());
        throw new Error("Received non-JSON response from server. Expected application/json.");
      }

      // Try to parse the successful JSON response.
      try {
        const data: PromptPackageAPIOutput = await response.json();
        // The API is expected to return the full PromptPackage object upon success.
        return data;
      } catch (error) {
        console.error("Failed to parse JSON response from server:", error);
        throw new Error("Failed to parse successful JSON response from server.");
      }
    },
    // TanStack Query options can be added here, e.g., onSuccess, onError, onSettled.
  });
};
