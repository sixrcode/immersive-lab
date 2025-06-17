import { v4 as uuidv4 } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';
// import { PromptToPrototypeInputSchema, type PromptToPrototypeInput } from '@/ai/flows/prompt-to-prototype';
import type { PromptPackage, Logline, MoodBoardCell, Shot, PromptToPrototypeInput } from '@/lib/types'; // Assuming PromptToPrototypeInput will be here or defined locally
import { z } from 'zod'; // Import Zod
import { db, firebaseAdminApp } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

// Define the structure of the expected response from the prompt generation microservice
interface PromptGenServiceOutput {
  loglines: Logline[];
  moodBoardCells: MoodBoardCell[];
  moodBoardImage: string; // Firebase Storage URL of the generated mood board image
  shotList: string;       // Multi-line string representing the shot list
  proxyClipAnimaticDescription: string;
  pitchSummary: string;
  originalUserImageURL?: string; // Firebase Storage URL of the user-uploaded image (if applicable)
}

/**
 * @fileoverview Next.js API route for generating prototype assets.
 *
 * This route handles POST requests to `/api/prototype/generate`.
 * It serves as a gateway that:
 * 1. Validates the client's input.
 * 2. Calls a dedicated microservice (`prompt-gen-service`) to perform the AI generation.
 * 3. Receives the generated assets from the microservice.
 * 4. Constructs a `PromptPackage` object with those assets.
 * 5. Saves the `PromptPackage` to Firestore.
 * 6. Returns the `PromptPackage` to the client.
 *
 * Note: Local AI flows and direct image processing (e.g., uploadImageToStorage, dataUriToBuffer) have been removed.
 *       This API route now delegates all such logic to the prompt-gen-service microservice.
 */
export async function POST(req: NextRequest): Promise<NextResponse<PromptPackage | { error: string; details?: any }>> {
  // 1. Check Firebase Admin SDK
  if (!firebaseAdminApp) {
    console.error('Firebase Admin SDK not initialized. Cannot process request.');
    return NextResponse.json(
      { error: 'Firebase Admin SDK not initialized. Check server logs.' },
      { status: 500 }
    );
  }

  // 2. Validate input using Zod
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
  let microserviceUrl =
    process.env.PROMPT_GEN_SERVICE_URL || process.env.NEXT_PUBLIC_AI_MICROSERVICE_URL;

  if (!microserviceUrl) {
    console.warn('AI microservice URL is not configured. Defaulting to localhost.');
    microserviceUrl = 'http://localhost:8080/generate';
  } else if (!microserviceUrl.endsWith('/generate')) {
    microserviceUrl = microserviceUrl.replace(/\/?$/, '/generate');
  }

  // 4. Call the AI microservice
let flowOutput: PromptGenServiceOutput;
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
    } catch (_) {}
    console.error('AI service error:', response.status, errorBody);
    return NextResponse.json(
      { error: 'AI service request failed.', details: errorBody || response.statusText },
      { status: response.status }
    );
  }

  flowOutput = await response.json() as PromptGenServiceOutput; // Type assertion
} catch (error: unknown) { // Catching unknown error type
  console.error('Failed to call AI microservice:', error);
  return NextResponse.json( // Return specific error message
    { error: 'Failed to contact prompt generation service.', details: error instanceof Error ? error.message : String(error) },
    { status: 503 }
  );
}

// 5. Extract values and construct PromptPackage
const { prompt, imageDataUri, stylePreset } = validatedInput;
const userId = 'anonymous_user';
const promptPackageId: string = uuidv4();

const parseShotList = (shotListString: string): Shot[] => {
  if (!shotListString) return [];
  return shotListString.trim().split('\n').map((line, index) => {
    const [num, lens, move, ...notes] = line.split(',').map(str => str.trim());
    const shotNumber = parseInt(num, 10) || index + 1;
    return {
      shotNumber,
      lens: lens || '',
      cameraMove: move || '',
      framingNotes: notes.join(', ') || '',
    };
  });
};

const moodBoardCells = flowOutput.moodBoardCells.map(cell => ({
  title: cell.title,
  description: cell.description,
}));

const newPromptPackage: PromptPackage = {
  id: promptPackageId,
  userId: 'anonymous_user', // Using literal string as userId is not derived from auth yet
  prompt,
  stylePreset,
  originalImageURL: flowOutput.originalUserImageURL || imageDataUri,
  createdAt: new Date(),
  updatedAt: new Date(),
  loglines: flowOutput.loglines,
  moodBoard: {
    generatedImageURL: flowOutput.moodBoardImage,
    cells: moodBoardCells,
  },
  shotList: parseShotList(flowOutput.shotList),
  animaticDescription: flowOutput.proxyClipAnimaticDescription,
  pitchSummary: flowOutput.pitchSummary,
  version: 1, // Assuming version starts at 1
};

// 6. Store the new `PromptPackage` in Firestore.
if (db) {
  try {
    await db.collection('prompt-packages').doc(newPromptPackage.id).set(newPromptPackage);
    console.log(`PromptPackage ${newPromptPackage.id} saved to Firestore.`);
  } catch (firestoreError: unknown) {
    const message =
      firestoreError instanceof Error
        ? firestoreError.message
        : 'Unknown Firestore error';
    console.error('Failed to save PromptPackage to Firestore:', message, firestoreError
    );
    return NextResponse.json(
      { error: 'Failed to save data to database.', details: message },
      { status: 500 }
    );
  }
} else {
  console.warn('Firestore (db) is not initialized. PromptPackage was not saved.');
 return NextResponse.json(
    { error: 'Database service unavailable. Data not saved.' },
    { status: 500 }
  );
}

  // 7. Return the created `PromptPackage` to the client.
  return NextResponse.json(newPromptPackage, { status: 201 }); // Use 201 for created resource
}
