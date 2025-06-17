import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
// Local AI flow and direct image handling (uploadImageToStorage, dataUriToBuffer) were removed.
// This route now acts as a gateway to the prompt-gen-service microservice.

// Schema for initial validation of the request from the client.
import { PromptToPrototypeInputSchema, type PromptToPrototypeInput } from '@/ai/flows/prompt-to-prototype';
// Types for constructing the PromptPackage to be saved in Firestore.
import type { PromptPackage, Logline, MoodBoardCell, Shot } from '@/lib/types';
// Firebase Admin SDK for Firestore database operations.
import { db, firebaseAdminApp } from '@/lib/firebase/admin';

/**
 * @fileoverview Next.js API route for generating prototype assets.
 *
 * This route handles POST requests to `/api/prototype/generate`.
 * It serves as a gateway that:
 * 1. Validates the client's input.
 * 2. Calls a dedicated microservice (`prompt-gen-service`) to perform the intensive AI generation tasks.
 * 3. Receives the generated assets from the microservice.
 * 4. Constructs a `PromptPackage` object with these assets.
 * 5. Saves the `PromptPackage` to Firestore.
 * 6. Returns the `PromptPackage` to the client.
 */

// Define the expected structure of the response from the prompt generation microservice.
// This helps in typing the data received from the microservice.
interface PromptGenServiceOutput {
  loglines: Logline[];
  moodBoardCells: MoodBoardCell[];
  moodBoardImage: string; // This is a URL to the generated mood board image in Firebase Storage.
  shotList: string;       // A string representation of the shot list, will be parsed.
  proxyClipAnimaticDescription: string;
  pitchSummary: string;
  originalUserImageURL?: string; // URL to the user-uploaded image in Firebase Storage (if provided).
  // Optional raw JSON string fields from the microservice (can be used for debugging or detailed storage)
  loglinesJsonString?: string;
  moodBoardCellsJsonString?: string;
  shotListMarkdownString?: string;
  allTextAssetsJsonString?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Ensure Firebase Admin SDK is initialized before proceeding.
  if (!firebaseAdminApp) {
    console.error('Firebase Admin SDK not initialized. Cannot process request.');
    return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Check server logs.' }, { status: 500 });
  }

  // Determine the URL for the prompt generation microservice.
  // It should be configured via the PROMPT_GEN_SERVICE_URL environment variable.
  let PROMPT_GEN_SERVICE_URL = process.env.PROMPT_GEN_SERVICE_URL;
  if (!PROMPT_GEN_SERVICE_URL) {
    // Fallback to localhost if the environment variable is not set (e.g., for local development).
    PROMPT_GEN_SERVICE_URL = 'http://localhost:8080/generate';
    console.warn(`PROMPT_GEN_SERVICE_URL not set, using default: ${PROMPT_GEN_SERVICE_URL}`);
  } else {
    // Ensure the /generate path is appended if only the base URL is provided in the env var.
    if (!PROMPT_GEN_SERVICE_URL.endsWith('/generate')) {
      PROMPT_GEN_SERVICE_URL = PROMPT_GEN_SERVICE_URL.replace(/\/?$/, '/generate');
    }
  }

  try {
    // 1. Parse and validate the incoming JSON request body from the client.
    const body = await req.json();
    let validatedInput: PromptToPrototypeInput;
    try {
      // Use Zod schema for robust validation.
      validatedInput = PromptToPrototypeInputSchema.parse(body);
    } catch (error: unknown) {
      // If validation fails, return a 400 error with details.
      console.error('Invalid input from client:', error);
      return NextResponse.json({ error: 'Invalid input', details: error instanceof Error ? error.message : 'Unknown validation error' }, { status: 400 });
    }

    // Extract data from the validated input.
    const { prompt, imageDataUri, stylePreset } = validatedInput;

    // Generate unique IDs for user (placeholder) and the prompt package.
    const userId = 'anonymous_user'; // Placeholder for user ID; replace with actual authentication logic.
    const promptPackageId = uuidv4(); // Unique ID for this PromptPackage.

    // 2. Call the prompt generation microservice.
    let microserviceResponse: Response;
    let flowOutput: PromptGenServiceOutput; // Typed response from the microservice.

    try {
      console.log(`Calling prompt generation microservice at: ${PROMPT_GEN_SERVICE_URL}`);
      microserviceResponse = await fetch(PROMPT_GEN_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedInput), // Forward the validated input to the microservice.
      });

      if (!microserviceResponse.ok) {
        // If the microservice returns an error, attempt to parse its response and throw an error.
        const errorBody = await microserviceResponse.text();
        console.error('Microservice error response:', errorBody);
        throw new Error(`Microservice request failed with status ${microserviceResponse.status}: ${errorBody}`);
      }
      // Parse the successful JSON response from the microservice.
      flowOutput = await microserviceResponse.json() as PromptGenServiceOutput;
    } catch (error: any) {
      console.error('Error calling prompt generation microservice:', error);
      return NextResponse.json({ error: 'Failed to connect to or get response from prompt generation service.', details: error.message }, { status: 503 }); // 503 Service Unavailable
    }

    // 3. Process the response from the microservice.
    // Image URLs are now directly provided by the microservice.
    const finalOriginalImageURL = flowOutput.originalUserImageURL || imageDataUri; // Use URL from service, or original if it was already a URL.
    const finalMoodBoardImageURL = flowOutput.moodBoardImage; // This is the URL of the AI-generated mood board image.

    // Helper function to parse the shot list string (comma-separated values) into a structured array.
    const parseShotList = (shotListString: string): Shot[] => {
      if (!shotListString) return [];
      return shotListString.trim().split('\n').map((shotData, index) => {
        const parts = shotData.split(',');
        const shotNumberStr = parts.length > 0 ? parts[0].trim() : `${index + 1}`;
        const lens = parts.length > 1 ? parts[1].trim() : '';
        const cameraMove = parts.length > 2 ? parts[2].trim() : '';
        const framingNotes = parts.length > 3 ? parts.slice(3).join(',').trim() : '';
        const shotNumber = parseInt(shotNumberStr, 10);
        return {
          shotNumber: isNaN(shotNumber) ? index + 1 : shotNumber, // Default to index if parsing fails
          lens,
          cameraMove,
          framingNotes,
        };
      });
    };

    // Map mood board cell data from the microservice response.
    const moodBoardCells: MoodBoardCell[] = flowOutput.moodBoardCells.map(cell => ({
        title: cell.title,
        description: cell.description,
    }));

    // 4. Construct the `PromptPackage` object to be saved to Firestore.
    const newPromptPackage: PromptPackage = {
      id: promptPackageId,
      userId,
      prompt,         // From original client input
      stylePreset,    // From original client input
      originalImageURL: finalOriginalImageURL, // URL of user's image (if any) after microservice processing
      createdAt: new Date(),
      updatedAt: new Date(),
      loglines: flowOutput.loglines as Logline[], // Type assertion, assuming microservice returns valid format
      moodBoard: {
        generatedImageURL: finalMoodBoardImageURL, // URL of AI-generated mood board image
        cells: moodBoardCells,
      },
      shotList: parseShotList(flowOutput.shotList), // Parsed shot list
      animaticDescription: flowOutput.proxyClipAnimaticDescription,
      pitchSummary: flowOutput.pitchSummary,
      version: 1, // Initial version of the prompt package
      // Optional: Store raw JSON strings from microservice if needed for debugging or data integrity.
      // loglinesJsonString: flowOutput.loglinesJsonString,
      // moodBoardCellsJsonString: flowOutput.moodBoardCellsJsonString,
      // shotListMarkdownString: flowOutput.shotListMarkdownString,
      // allTextAssetsJsonString: flowOutput.allTextAssetsJsonString,
    };

    // 5. Store the new `PromptPackage` in Firestore.
    if (db) {
      try {
        await db.collection('promptPackages').doc(newPromptPackage.id).set(newPromptPackage);
        console.log(`PromptPackage ${newPromptPackage.id} saved to Firestore.`);
      } catch (firestoreError: unknown) {
        const message = firestoreError instanceof Error ? firestoreError.message : 'Unknown Firestore error';
        console.error('Failed to save PromptPackage to Firestore:', message, firestoreError);
        // If saving to Firestore fails, this is a server-side issue.
        return NextResponse.json({ error: 'Failed to save data to database.', details: message }, { status: 500 });
      }
    } else {
      // This should not happen if Firebase Admin SDK was initialized correctly.
      console.warn('Firestore (db) is not initialized. PromptPackage was not saved.');
      return NextResponse.json({ error: 'Database service not available. Data not saved.' }, { status: 500 });
    }

    // 6. Return the created `PromptPackage` to the client.
    return NextResponse.json(newPromptPackage, { status: 200 });

  } catch (error: unknown) {
    // Catch-all error handler for unexpected errors in this route.
    console.error('Error in /api/prototype/generate (main handler):', error);
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Internal Server Error in API Gateway', details: errorMessage }, { status: 500 });
  }
}
