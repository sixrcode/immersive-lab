import { NextRequest, NextResponse } from 'next/server';
import {
  StoryboardGeneratorInputSchema,
  StoryboardGeneratorInput,
  StoryboardPanelWithImage as MicroservicePanelOutput // Panel from AI microservice (includes imageDataUri)
} from '@/lib/ai-types';
import {
  StoryboardPackage as FinalStoryboardPackage, // Renaming to avoid conflict if any local var is named StoryboardPackage
  Panel as FinalPanel // Panel structure for Firestore and final API response
} from '../../../../../../packages/types/src/storyboard.types';
import { firebaseAdminApp } from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';
// import { StoryboardPackage } from '../../../../../../types/src/storyboard.types'; // Adjust path as necessary

const AI_MICROSERVICE_URL = process.env.NEXT_PUBLIC_AI_MICROSERVICE_URL;

// Type for the expected output from the AI microservice
// This should align with StoryboardGeneratorOutputSchema from @/lib/ai-types
interface MicroserviceOutput {
  panels: MicroservicePanelOutput[]; // Each panel includes imageDataUri, description, shotDetails, etc.
  titleSuggestion?: string; // AI microservice returns titleSuggestion
  [key: string]: unknown; // Allow other top-level properties from AI, though ideally should be typed
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

    const aiStoryboardResult: MicroserviceOutput = await microserviceResponse.json();

    // 3. Generate new storyboard ID
    const newStoryboardId = adminFirestore.collection('storyboards').doc().id;
    const now = Timestamp.now(); // Define `now` here for generatedAt timestamp

    // 4. Process and Upload Images
    const processedPanels: FinalPanel[] = []; // Use FinalPanel type
    if (aiStoryboardResult.panels && Array.isArray(aiStoryboardResult.panels)) {
      // Loop through panels received from AI microservice (type MicroservicePanelOutput)
      for (const microservicePanel of aiStoryboardResult.panels) {
        if (!microservicePanel.imageDataUri) {
          console.warn(`Panel number ${microservicePanel.panelNumber} missing imageDataUri, skipping image upload.`);
          // Construct a minimal FinalPanel if image processing is skipped
          processedPanels.push({
            id: uuidv4(), // Generate an ID
            imageURL: '',
            previewURL: '',
            alt: microservicePanel.alt || microservicePanel.description || 'Image generation failed',
            caption: microservicePanel.description || `Panel ${microservicePanel.panelNumber}`,
            camera: microservicePanel.shotDetails || '',
            // panelNumber: microservicePanel.panelNumber, // Add if FinalPanel type is extended
            // dialogueOrSound: microservicePanel.dialogueOrSound, // Add if FinalPanel type is extended
            generatedAt: now.toDate().toISOString(),
          });
          continue;
        }

        let buffer: Buffer;
        let contentType: string = 'image/png'; // Default, can be inferred

        try {
          if (microservicePanel.imageDataUri.startsWith('data:')) {
            // Handle Data URI
            const matches = microservicePanel.imageDataUri.match(/^data:(.+);base64,(.*)$/);
            if (!matches || matches.length !== 3) {
              throw new Error('Invalid data URI format');
            }
            contentType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
          } else if (microservicePanel.imageDataUri.startsWith('http')) {
            // Handle URL
            const imageResponse = await fetch(microservicePanel.imageDataUri);
            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch image from URL: ${microservicePanel.imageDataUri} - Status: ${imageResponse.status}`);
            }
            const arrayBuffer = await imageResponse.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            contentType = imageResponse.headers.get('content-type') || contentType;
          } else {
            console.warn(`Unsupported imageDataUri format for panel number ${microservicePanel.panelNumber}: ${microservicePanel.imageDataUri.substring(0,30)}... Skipping.`);
            // Construct a minimal FinalPanel with error indication
            processedPanels.push({
              id: uuidv4(),
              imageURL: '',
              previewURL: '',
              alt: microservicePanel.alt || microservicePanel.description || 'Unsupported image format',
              caption: microservicePanel.description || `Panel ${microservicePanel.panelNumber}`,
              camera: microservicePanel.shotDetails || '',
              // panelNumber: microservicePanel.panelNumber,
              // dialogueOrSound: microservicePanel.dialogueOrSound,
              generatedAt: now.toDate().toISOString(),
            });
            continue;
          }

          const panelId = uuidv4(); // Generate a new unique ID for the FinalPanel
          const fileExtension = contentType.split('/')[1] || 'png';
          const filePath = `users/${userId}/storyboards/${newStoryboardId}/panels/${panelId}/image.${fileExtension}`;

          const file = adminStorage.bucket().file(filePath);
          await file.save(buffer, {
            public: true,
            contentType: contentType,
          });
          const publicUrl = file.publicUrl();

          // Construct FinalPanel with mapped fields
          processedPanels.push({
            id: panelId,
            imageURL: publicUrl,
            previewURL: publicUrl, // For now, preview is same as main image
            alt: microservicePanel.alt || microservicePanel.description, // Use alt from microservicePanel, fallback to its description
            caption: microservicePanel.description, // Map description to caption
            camera: microservicePanel.shotDetails, // Map shotDetails to camera
            // panelNumber: microservicePanel.panelNumber, // Add if FinalPanel type is extended
            // dialogueOrSound: microservicePanel.dialogueOrSound, // Add if FinalPanel type is extended
            generatedAt: now.toDate().toISOString(),
          });

        } catch (uploadError: unknown) {
          console.error(`Error processing/uploading image for panel number ${microservicePanel.panelNumber}:`, uploadError);
          // Construct a minimal FinalPanel with error indication
          processedPanels.push({
            id: uuidv4(),
            imageURL: '',
            previewURL: '',
            alt: microservicePanel.alt || microservicePanel.description || 'Image processing error',
            caption: microservicePanel.description || `Panel ${microservicePanel.panelNumber}`,
            camera: microservicePanel.shotDetails || '',
            // panelNumber: microservicePanel.panelNumber,
            // dialogueOrSound: microservicePanel.dialogueOrSound,
            generatedAt: now.toDate().toISOString(),
            // error: uploadError instanceof Error ? uploadError.message : 'Image processing failed' // Add if FinalPanel supports error field
          });
        }
      }
    } else {
      console.warn('No panels array found in AI microservice response or it is not an array.');
    }

    // 5. Construct StoryboardPackage
    // `now` is already defined
    const storyboardPackageData: FinalStoryboardPackage = {
      id: newStoryboardId,
      userId: userId,
      projectId: projectId,
      title: aiStoryboardResult.titleSuggestion || validatedInput.sceneDescription.substring(0, 50) || 'Untitled Storyboard',
      sceneDescription: validatedInput.sceneDescription,
      panelCount: processedPanels.length,
      stylePreset: validatedInput.stylePreset,
      panels: processedPanels, // This is now an array of FinalPanel
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
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
