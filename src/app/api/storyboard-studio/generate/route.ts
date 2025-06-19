import { NextRequest, NextResponse } from 'next/server';
import { StoryboardGeneratorInputSchema, StoryboardGeneratorInput, StoryboardPanelWithImage as Panel } from '@/lib/ai-types'; // Updated import
import { firebaseAdminApp } from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, Firestore, DocumentData } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';
// import { StoryboardPackage } from '../../../../../../types/src/storyboard.types'; // Adjust path as necessary

const AI_MICROSERVICE_URL = process.env.NEXT_PUBLIC_AI_MICROSERVICE_URL;

// Define a more specific type for the expected AI service output
interface AIServicePanelInput {
  id?: string;
  imageDataUri?: string;
  panelNumber?: number; // Made optional as code defaults if not present in panel processing
  description?: string; // Made optional
  dialogue?: string;
  action?: string;
  cameraAngle?: string;
  cameraShotSize?: string;
  notes?: string;
  [key: string]: unknown; // Allow other properties from AI
}

interface AIServiceStoryboardResult {
  panels?: AIServicePanelInput[];
  title?: string;
  [key: string]: unknown; // Allow other top-level properties from AI
}

// Ensure Firebase Admin is initialized
if (!firebaseAdminApp) {
  console.error('Firebase Admin SDK has not been initialized.');
  // This should ideally not happen if admin.ts is correctly set up and imported.
}

const adminAuth = getAuth(firebaseAdminApp);
const adminFirestore: Firestore = getFirestore();
const adminStorage = getStorage(firebaseAdminApp);

export async function POST(req: NextRequest): Promise<NextResponse> {
  let projectId: string;
  if (!firebaseAdminApp) {
    return NextResponse.json({ error: 'Firebase Admin SDK not initialized.' }, { status: 500 });
  }
  if (!AI_MICROSERVICE_URL) {
    console.error('AI_MICROSERVICE_URL is not set.');
    return NextResponse.json({ error: 'Service configuration error.' }, { status: 500 });
  }

  let validatedInput: StoryboardGeneratorInput;
  try {
    const body = await req.json();
    const { projectId: extractedProjectId, ...aiInputData } = body;
    projectId = extractedProjectId;

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid projectId' }, { status: 400 });
    }

    validatedInput = StoryboardGeneratorInputSchema.parse(aiInputData);
  } catch (error: unknown) {
    // Check if the error is from Zod parsing (due to aiInputData) or the projectId check
    if (error instanceof Error && 'issues' in error) { // ZodError has 'issues'
        return NextResponse.json({ error: 'Invalid input for AI generation parameters.', details: error.message }, { status: 400 });
    }
    // If it's not a Zod error, it might be from JSON parsing or other unexpected issues.
    // The projectId check above returns its own response, so this path is less likely for projectId issues.
    return NextResponse.json({ error: 'Invalid request body structure.', details: error instanceof Error ? error.message : 'Unknown validation error' }, { status: 400 });
  }

  const authorizationHeader = req.headers.get('Authorization');
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized. No Bearer token provided.' }, { status: 401 });
  }
  const idToken = authorizationHeader.split('Bearer ')[1];
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized. Bearer token is empty.' }, { status: 401 });
  }

  try {
    // 1. Decode ID token to get userId
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // 2. Call AI Microservice
    const microserviceResponse = await fetch(`${AI_MICROSERVICE_URL}/generateStoryboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass the original Authorization header or a new service account token if preferred for inter-service auth
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify(validatedInput),
    });

    if (!microserviceResponse.ok) {
      let errorBody = null;
      try {
        errorBody = await microserviceResponse.json();
      } catch { /* Ignore */ }
      console.error('Error from AI microservice (generateStoryboard):', microserviceResponse.status, errorBody);
      return NextResponse.json(
        { error: 'AI service request failed (storyboard generation).', details: errorBody || microserviceResponse.statusText },
        { status: microserviceResponse.status }
      );
    }

    // TODO: Replace 'any' with a specific type definition when the AI service output structure is known.
    const aiStoryboardResult: AIServiceStoryboardResult = await microserviceResponse.json();

    // 3. Generate new storyboard ID
    const newStoryboardId = adminFirestore.collection('storyboards').doc().id;

    // 4. Process and Upload Images
    const processedPanels: Panel[] = [];
    if (aiStoryboardResult.panels && Array.isArray(aiStoryboardResult.panels)) {
      for (const panel of aiStoryboardResult.panels) {
        if (!panel.imageDataUri) {
          console.warn(`Panel ID ${panel.id || 'unknown'} missing imageDataUri, skipping image upload.`);
          processedPanels.push({ ...panel, imageURL: '', previewURL: '' }); // Add panel even if image is missing
          continue;
        }

        let buffer: Buffer;
        let contentType: string = 'image/png'; // Default, can be inferred

        try {
          if (panel.imageDataUri.startsWith('data:')) {
            // Handle Data URI
            const matches = panel.imageDataUri.match(/^data:(.+);base64,(.*)$/);
            if (!matches || matches.length !== 3) {
              throw new Error('Invalid data URI format');
            }
            contentType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
          } else if (panel.imageDataUri.startsWith('http')) {
            // Handle URL
            const imageResponse = await fetch(panel.imageDataUri);
            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch image from URL: ${panel.imageDataUri} - Status: ${imageResponse.status}`);
            }
            const arrayBuffer = await imageResponse.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            contentType = imageResponse.headers.get('content-type') || contentType;
          } else {
            console.warn(`Unsupported imageDataUri format for panel ID ${panel.id || 'unknown'}: ${panel.imageDataUri.substring(0,30)}... Skipping.`);
            processedPanels.push({ ...panel, imageURL: '', previewURL: '' });
            continue;
          }

          const panelId = panel.id || uuidv4(); // Use existing panel ID or generate one
          const fileExtension = contentType.split('/')[1] || 'png';
          const filePath = `users/${userId}/storyboards/${newStoryboardId}/panels/${panelId}/image.${fileExtension}`;

          const file = adminStorage.bucket().file(filePath);
          await file.save(buffer, {
            public: true,
            contentType: contentType,
          });
          const publicUrl = file.publicUrl();

          processedPanels.push({
            ...panel,
            id: panelId, // Ensure panel has an ID
            imageURL: publicUrl,
            previewURL: publicUrl, // For now, preview is same as main image
            imageDataUri: undefined, // Remove original data URI
          });

        } catch (uploadError: unknown) { // Ensure uploadError is typed as unknown
          console.error(`Error processing/uploading image for panel ${panel.id || 'unknown'}:`, uploadError);
          // Decide if to fail all or just skip this panel's image
          // For now, we'll add the panel without the image URL if upload fails
          processedPanels.push({
            ...panel,
            imageURL: '',
            previewURL: '',
            imageDataUri: undefined,
            error: uploadError instanceof Error ? uploadError.message : 'Image processing failed'
          });
        }
      }
    } else {
      console.warn('No panels array found in AI microservice response or it is not an array.');
    }

    // 5. Construct StoryboardPackage
    const now = Timestamp.now();
    const storyboardPackageData: DocumentData = { // Use DocumentData for Firestore data
      id: newStoryboardId,
      userId: userId,
      projectId: projectId, // Include projectId from the request
      title: aiStoryboardResult.title || validatedInput.sceneDescription.substring(0, 50) || 'Untitled Storyboard',
      sceneDescription: validatedInput.sceneDescription,
      panelCount: processedPanels.length, // This should align with StoryboardPackage type
      stylePreset: validatedInput.stylePreset,
      panels: processedPanels,
      createdAt: now, // Ensure this is Firestore Timestamp
      updatedAt: now, // Ensure this is Firestore Timestamp
      // Add other fields from aiStoryboardResult or validatedInput as necessary
      // e.g., characters: aiStoryboardResult.characters || [],
      // settings: aiStoryboardResult.settings || [],
    };

    // 6. Save to Firestore
    await adminFirestore.collection('storyboards').doc(newStoryboardId).set(storyboardPackageData);

    // 7. Return the created StoryboardPackage
    return NextResponse.json(storyboardPackageData, { status: 201 });

  } catch (error: unknown) {
    console.error('Error in storyboard generation and persistence process:', error);
    if (error instanceof Error && 'code' in error && error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Firebase ID token has expired. Please re-authenticate.' }, { status: 401 });
    }
    if (error instanceof Error && 'code' in error && error.code === 'auth/argument-error') {
      return NextResponse.json({ error: 'Invalid Firebase ID token.' }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error during storyboard processing.' }, { status: 500 });
  }
}
