import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';
import { PromptToPrototypeInputSchema, type PromptToPrototypeInput } from '@/ai/flows/prompt-to-prototype';
import type { PromptPackage, Logline, MoodBoardCell, Shot } from '@/lib/types';
import { db, firebaseAdminApp } from '@/lib/firebase/admin';

interface PromptGenServiceOutput {
  loglines: Logline[];
  moodBoardCells: MoodBoardCell[];
  moodBoardImage: string;
  shotList: string;
  proxyClipAnimaticDescription: string;
  pitchSummary: string;
  originalUserImageURL?: string;
  loglinesJsonString?: string;
  moodBoardCellsJsonString?: string;
  shotListMarkdownString?: string;
  allTextAssetsJsonString?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!firebaseAdminApp) {
    console.error('Firebase Admin SDK not initialized. Cannot process request.');
    return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Check server logs.' }, { status: 500 });
  }

  const rawBody = await req.json();

  const parseResult = PromptToPrototypeInputSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid request body.', details: parseResult.error.format() }, { status: 400 });
  }

  const validatedInput: PromptToPrototypeInput = parseResult.data;

  let microserviceUrl = process.env.PROMPT_GEN_SERVICE_URL || process.env.NEXT_PUBLIC_AI_MICROSERVICE_URL;
  if (!microserviceUrl) {
    console.warn('AI microservice URL is not configured. Defaulting to localhost.');
    microserviceUrl = 'http://localhost:8080/generate';
  } else if (!microserviceUrl.endsWith('/generate')) {
    microserviceUrl = microserviceUrl.replace(/\/?$/, '/generate');
  }

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
    return NextResponse.json({ error: 'Failed to reach AI generation service.' }, { status: 502 });
  }

  if (!responseFromService.ok) {
    console.error('AI microservice error:', await responseFromService.text());
    return NextResponse.json({ error: 'AI service responded with an error.' }, { status: 500 });
  }

  const data: PromptGenServiceOutput = await responseFromService.json();

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
    return NextResponse.json({ error: 'Failed to save data.' }, { status: 500 });
  }

  return NextResponse.json(promptPackage);
}

  try {
    // 1. Parse and validate the incoming JSON request body from the client.
    const body = await req.json();
import { v4 as uuidv4 } from 'uuid';
import { PromptToPrototypeInputSchema, type PromptToPrototypeInput } from '@/ai/flows/prompt-to-prototype';
import type { PromptPackage, Logline, MoodBoardCell, Shot } from '@/lib/types';
import { db } from '@/lib/firebase/admin';
import { NextRequest, NextResponse } from 'next/server';

interface PromptGenServiceOutput {
  loglines: Logline[];
  moodBoardCells: MoodBoardCell[];
  moodBoardImage: string;
  shotList: string;
  proxyClipAnimaticDescription: string;
  pitchSummary: string;
  originalUserImageURL?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    let validatedInput: PromptToPrototypeInput;

    try {
      validatedInput = PromptToPrototypeInputSchema.parse(body);
    } catch (error: unknown) {
      return NextResponse.json({
        error: 'Invalid input',
        details: error instanceof Error ? error.message : 'Unknown validation error',
      }, { status: 400 });
    }

    const authorizationHeader = req.headers.get('Authorization');
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. No Bearer token provided.' }, { status: 401 });
    }

    const idToken = authorizationHeader.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized. Bearer token is empty.' }, { status: 401 });
    }

    const AI_MICROSERVICE_URL = process.env.NEXT_PUBLIC_AI_MICROSERVICE_URL;
    if (!AI_MICROSERVICE_URL) {
      return NextResponse.json({ error: 'AI microservice URL is not configured.' }, { status: 500 });
    }

    let microserviceResponse: Response;
    let flowOutput: PromptGenServiceOutput;

    try {
      microserviceResponse = await fetch(`${AI_MICROSERVICE_URL}/promptToPrototype`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(validatedInput),
      });

      if (!microserviceResponse.ok) {
        let errorBody = null;
        try {
          errorBody = await microserviceResponse.json();
        } catch (_) {}
        console.error('Error from AI microservice:', microserviceResponse.status, errorBody);
        return NextResponse.json(
          { error: 'AI service request failed.', details: errorBody || microserviceResponse.statusText },
          { status: microserviceResponse.status }
        );
      }

      flowOutput = await microserviceResponse.json() as PromptGenServiceOutput;
    } catch (error: any) {
      console.error('Error calling AI microservice:', error);
      return NextResponse.json({ error: 'Failed to contact prompt generation service.', details: error.message }, { status: 503 });
    }

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

    if (db) {
      try {
        await db.collection('promptPackages').doc(newPromptPackage.id).set(newPromptPackage);
        console.log(`PromptPackage ${newPromptPackage.id} saved to Firestore.`);
      } catch (firestoreError: unknown) {
        const message = firestoreError instanceof Error ? firestoreError.message : 'Unknown Firestore error';
        console.error('Failed to save PromptPackage to Firestore:', message, firestoreError);
        return NextResponse.json({ error: 'Failed to save to database.', details: message }, { status: 500 });
      }
    } else {
      console.warn('Firestore (db) not initialized.');
      return NextResponse.json({ error: 'Database service unavailable. Data not saved.' }, { status: 500 });
    }

    return NextResponse.json(newPromptPackage, { status: 200 });

  } catch (error: unknown) {
    console.error('Unexpected error in /api/prototype/generate:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({
      error: 'Internal Server Error in API Gateway',
      details: errorMessage,
    }, { status: 500 });
  }
}

  }
}
