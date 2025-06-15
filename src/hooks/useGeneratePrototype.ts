import { useMutation } from "@tanstack/react-query";

export interface PromptInput {
  prompt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>;
}

export interface PromptPackage {
  inputs: PromptInput[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>;
}

export const useGeneratePrototype = () => {
  return useMutation<string, Error, PromptPackage>(async (promptPackage) => {
    const response = await fetch("/api/prototype/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(promptPackage),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("text/html")) {
      throw new Error("Received HTML response instead of JSON");
    }

    try {
      const data = await response.json();
      // Assuming the API returns a JSON object with a 'url' property
      // when successful, and the 'url' is a string.
      // Adjust if the actual successful response structure is different.
      if (data && typeof data.url === 'string') {
        return data.url;
      } else {
        // Handle cases where the JSON does not have the expected structure
        throw new Error("Invalid JSON response structure");
      }
    } catch (error) {
      // Handle cases where response.json() fails (e.g., not valid JSON)
      throw new Error("Failed to parse JSON response");
    }
  });
};
