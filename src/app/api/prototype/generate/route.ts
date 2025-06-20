import { NextRequest, NextResponse } from 'next/server';
// import { PromptToPrototypeInputSchema, type PromptToPrototypeInput } from '@/ai/flows/prompt-to-prototype';
// Assuming PromptToPrototypeInput will be here or defined locally.
// PromptPackage is now the expected output from the microservice.
import type { PromptPackage, PromptToPrototypeInput } from '@/lib/types';
import { z } from 'zod'; // Import Zod

// Helper function to extract serializable error details
function extractSerializableErrorDetails(errorBody: any): string {
  if (typeof errorBody === 'string') {
    return errorBody;
  }
  if (typeof errorBody === 'object' && errorBody !== null) {
    if (typeof errorBody.details === 'string') {
      return errorBody.details;
    }
    if (typeof errorBody.error === 'string') {
      return errorBody.error;
    }
    // Attempt to stringify a limited subset or return a generic message
    // This is a simplified example; you might want to be more selective
    // or add more checks depending on common error structures.
    try {
      // Only include specific, known-safe properties if necessary
      // For now, let's try a generic stringify and catch if it's too complex or circular
      const simpleError = {
        message: errorBody.message,
        code: errorBody.code,
        type: errorBody.type
      };
      const details = JSON.stringify(simpleError);
      if (details.length > 500) { // Limit length
        return "Error details from microservice are too verbose.";
      }
      return details;
    } catch (e) {
      return "Error details from microservice are not in expected string format or are too complex to serialize.";
    }
  }
  return "Error details from microservice are not in expected string format.";
}

/**
 * @fileoverview Next.js API route for generating prototype assets.
 *
 * This route handles POST requests to `/api/prompt-to-prototype/generate`.
 * It serves as a gateway that:
 * 1. Validates the client's input.
 * 2. Calls a dedicated microservice to perform the AI generation.
 * 3. Receives the generated assets from the microservice.
 * 4. Constructs a `PromptPackage` object with those assets.
 * 5. Saves the `PromptPackage` to Firestore.
 * 6. Returns the `PromptPackage` to the client.
 *
 * Note: Local AI flows and direct image processing (e.g., uploadImageToStorage, dataUriToBuffer) have been removed.
 *       This API route now delegates all such logic to the microservice.
 */
export async function POST(req: NextRequest): Promise<NextResponse<PromptPackage | { error: string; details?: unknown }>> {
  // 1. Validate input using Zod
  const rawBody = await req.json();
  // Define PromptToPrototypeInputSchema locally or import from a valid source
  const PromptToPrototypeInputSchema = z.object({
    prompt: z.string().min(1, "Prompt cannot be empty."),
    imageDataUri: z.string().optional(), // Base64 encoded image
    stylePreset: z.string().optional(),
    // Add other fields as necessary based on your PromptToPrototypeInput type
  });
  const parseResult = PromptToPrototypeInputSchema.safeParse(rawBody);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Invalid input',
        details: parseResult.error.format(),
      },
      { status: 400 }
    );
  }
  const validatedInput: PromptToPrototypeInput = parseResult.data;

  // 3. Check Authorization header for ID token
  const authorizationHeader = req.headers.get('Authorization');
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized. No Bearer token provided.' }, { status: 401 });
  }

  const idToken = authorizationHeader.split('Bearer ')[1];
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized. Bearer token is empty.' }, { status: 401 });
  }

  // 4. Determine the AI microservice URL
  let microserviceUrl = process.env.NEXT_PUBLIC_AI_MICROSERVICE_URL;

  if (!microserviceUrl) {
    console.error('AI microservice URL (NEXT_PUBLIC_AI_MICROSERVICE_URL) is not configured.');
    // Return an error response or handle as appropriate for your application
    return NextResponse.json({ error: 'AI microservice URL is not configured.' }, { status: 500 });
  }

  // Ensure the path /promptToPrototype is appended
  if (!microserviceUrl.endsWith('/promptToPrototype')) {
    microserviceUrl = microserviceUrl.replace(/\/?$/, '/promptToPrototype');
  }

  // 4. Call the AI microservice
// The microservice is expected to return a complete PromptPackage.
let flowOutput: PromptPackage;
try { // Added error handling for fetch
  const response = await fetch(microserviceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify(validatedInput),
  });

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json(); // Parse error body if available
    } catch {} // Removed unused variable _
    console.error('AI service error:', response.status, errorBody);
    const errorResponsePayload = {
      error: 'AI service request failed.',
      details: extractSerializableErrorDetails(errorBody) || response.statusText,
    };
    console.log('Returning error response to client:', JSON.stringify(errorResponsePayload, null, 2));
    return NextResponse.json(errorResponsePayload, { status: response.status });
  }

  flowOutput = await response.json() as PromptPackage; // Type assertion, expecting full PromptPackage
} catch (error: unknown) { // Catching unknown error type
  console.error('Failed to call AI microservice:', error);
  const errorResponsePayload = {
    error: 'Failed to contact AI generation service.',
    details: error instanceof Error ? error.message : String(error),
  };
  console.log('Returning error response to client (fetch failed):', JSON.stringify(errorResponsePayload, null, 2));
  return NextResponse.json(errorResponsePayload, { status: 503 });
}

// 5. The microservice is expected to return a complete PromptPackage.
// Firestore saving logic is removed.

  // 6. Return the `PromptPackage` received from the microservice to the client.
  // Status 200 OK as the resource was already created by the microservice.
  return NextResponse.json(flowOutput, { status: 200 });
}
