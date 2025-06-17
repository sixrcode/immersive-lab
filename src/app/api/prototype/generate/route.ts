import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';
import { PromptToPrototypeInputSchema, type PromptToPrototypeInput } from '@/ai/flows/prompt-to-prototype';
import type { PromptPackage, Logline, MoodBoardCell, Shot } from '@/lib/types';
import { db, firebaseAdminApp } from '@/lib/firebase/admin';

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

// Define the structure of the response from the prompt generation microservice
interface PromptGenServiceOutput {
  loglines: Logline[];
  moodBoardCells: MoodBoardCell[];
  moodBoardImage: string; // Firebase Storage URL of the generated mood board image
  shotList: string;       // Multi-line string representing the shot list
  proxyClipAnimaticDescription: string;
  pitchSummary: string;
  originalUserImageURL?: string; // Firebase Storage URL of the user-uploaded image (if applicable)

  // Optional raw JSON outputs for debugging or archival
  loglinesJsonString?: string;
  moodBoardCellsJsonString?: string;
  shotListMarkdownString?: string;
  allTextAssetsJsonString?: string;
}

  loglinesJsonString?: string;
  moodBoardCellsJsonString?: string;
  shotListMarkdownString?: string;
  allTextAssetsJsonString?: string;
}
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { PromptToPrototypeInputSchema, type PromptToPrototypeInput } from '@/ai/flows/prompt-to-prototype';
import type { PromptPackage } from '@/lib/types';
import { db, firebaseAdminApp } from '@/lib/firebase/admin';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Check Firebase Admin SDK
  if (!firebaseAdminApp) {
    console.error('Firebase Admin SDK not initialized. Cannot process request.');
    return NextResponse.json(
      { error: 'Firebase Admin SDK not initialized. Check server logs.' },
      { status: 500 }
    );
  }

  // 2. Parse and validate the request body
  const rawBody = await req.json();
  const parseResult = PromptToPrototypeInputSchema.safeParse(rawBody);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body.',
        details: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const validatedInput: PromptToPrototypeInput = parseResult.data;

  // 3. Determine microservice endpoint
  let microserviceUrl =
    process.env.PROMPT_GEN_SERVICE_URL || process.env.NEXT_PUBLIC_AI_MICROSERVICE_URL;

  if (!microserviceUrl) {
    console.warn('AI microservice URL is not configured. Defaulting to localhost.');
    microserviceUrl = 'http://localhost:8080/generate';
  } else if (!microserviceUrl.endsWith('/generate')) {
    microserviceUrl = microserviceUrl.replace(/\/?$/, '/generate');
  }

  // 4. Call the AI microservice
  let responseFromService: Response;
  try {
    responseFromService = await fetch(microserviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedInput),
    });
  } catch (error) {
    console.error('Failed to contact AI microservice:', error);
    return NextResponse.json(
      { error: 'Failed to reach AI generation service.' },
      { status: 502 }
    );
  }

  if (!responseFromService.ok) {
    console.error('AI microservice error:', await responseFromService.text());
    return NextResponse.json(
      { error: 'AI service responded with an error.' },
      { status: 500 }
    );
  }

  // 5. Construct and store the PromptPackage
  const data = await responseFromService.json();

  const promptPackage: PromptPackage = {
    id: uuidv4(),
    createdAt: Date.now(),
    input: validatedInput,
    ...data,
  };

  try {
    await db.collection('prompt-packages').doc(promptPackage.id).set(promptPackage);
  } catch (dbError) {
    console.error('Failed to store PromptPackage:', dbError);
    return NextResponse.json(
      { error: 'Failed to save data to Firestore.' },
      { status: 500 }
    );
  }

  // 6. Return result to client
  return NextResponse.json(promptPackage);
}


  try {
    // 1. Parse and validate the incoming JSON request body from the client.
    const body = await req.json();
import { v4 as uuidv4 } from 'uuid';
import { PromptToPrototypeInputSchema, type PromptToPrototypeInput } from '@/ai/flows/prompt-to-prototype';
import type { PromptPackage, Logline, MoodBoardCell, Shot } from '@/lib/types';
import { db, firebaseAdminApp } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

// Define the structure of the expected response from the prompt generation microservice
interface PromptGenServiceOutput {
  loglines: Logline[];
  moodBoardCells: MoodBoardCell[];
  moodBoardImage: string;
  shotList: string;
  proxyClipAnimaticDescription: string;
  pitchSummary: string;
  originalUserImageURL?: string;
}

    let validatedInput: PromptToPrototypeInput;

    try {
      // Use Zod schema for robust validation.
      validatedInput = PromptToPrototypeInputSchema.parse(body);
    } catch (error: unknown) {
// 1. Validate input using Zod
const rawBody = await req.json();
const parseResult = PromptToPrototypeInputSchema.safeParse(rawBody);

if (!parseResult.success) {
  return NextResponse.json({
    error: 'Invalid input',
    details: parseResult.error.format(),
  }, { status: 400 });
}

const validatedInput: PromptToPrototypeInput = parseResult.data;

// 2. Check Authorization header for ID token
const authorizationHeader = req.headers.get('Authorization');
if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
  return NextResponse.json({ error: 'Unauthorized. No Bearer token provided.' }, { status: 401 });
}

const idToken = authorizationHeader.split('Bearer ')[1];
if (!idToken) {
  return NextResponse.json({ error: 'Unauthorized. Bearer token is empty.' }, { status: 401 });
}

// 3. Determine the AI microservice URL
let microserviceUrl = process.env.PROMPT_GEN_SERVICE_URL || process.env.NEXT_PUBLIC_AI_MICROSERVICE_URL;
if (!microserviceUrl) {
  console.warn('AI microservice URL is not configured. Defaulting to localhost.');
  microserviceUrl = 'http://localhost:8080/generate';
} else if (!microserviceUrl.endsWith('/generate')) {
  microserviceUrl = microserviceUrl.replace(/\/?$/, '/generate');
}

// 4. Call the AI microservice
let flowOutput: PromptGenServiceOutput;
try {
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
      errorBody = await response.json();
    } catch (_) {}
    console.error('AI service error:', response.status, errorBody);
    return NextResponse.json(
      { error: 'AI service request failed.', details: errorBody || response.statusText },
      { status: response.status }
    );
  }

  flowOutput = await response.json() as PromptGenServiceOutput;
} catch (error: any) {
  console.error('Failed to call AI microservice:', error);
  return NextResponse.json(
    { error: 'Failed to contact prompt generation service.', details: error.message },
    { status: 503 }
  );
}

// 5. Extract values and construct PromptPackage
const { prompt, imageDataUri, stylePreset } = validatedInput;
const userId = 'anonymous_user';
const promptPackageId = uuidv4();

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
  userId,
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
  version: 1,
};

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
if (db) {
  try {
    await db.collection('promptPackages').doc(newPromptPackage.id).set(newPromptPackage);
    console.log(`PromptPackage ${newPromptPackage.id} saved to Firestore.`);
  } catch (firestoreError: unknown) {
    const message = firestoreError instanceof Error
      ? firestoreError.message
      : 'Unknown Firestore error';
    console.error('Failed to save PromptPackage to Firestore:', message, firestoreError);
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

    }

    // 6. Return the created `PromptPackage` to the client.
    return NextResponse.json(newPromptPackage, { status: 200 });

  } catch (error: unknown) {
} catch (error: unknown) {
  console.error('Unexpected error in /api/prototype/generate:', error);
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

  return NextResponse.json(
    {
      error: 'Internal Server Error in API Gateway',
      details: errorMessage,
    },
    { status: 500 }
  );
}
  }
}
