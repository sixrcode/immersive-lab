import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  promptToPrototype,
  PromptToPrototypeInput,
  PromptToPrototypeOutput, // Import this type
  PromptToPrototypeInputSchema
} from '@/ai/flows/prompt-to-prototype';
import type { PromptPackage, Logline, MoodBoardCell, Shot } from '@/lib/types';
import { db, storage, firebaseAdminApp } from '@/lib/firebase/admin'; // Firebase Admin
import { dataUriToBuffer, DataUriParts } from '@/lib/utils'; // Data URI utility

// Helper function to upload image buffer to Firebase Storage
async function uploadImageToStorage(
  buffer: Buffer,
  mimeType: string,
  extension: string,
  userId: string,
  promptPackageId: string,
  fileNamePrefix: string
): Promise<string> {
  if (!storage || !storage.bucket) {
    console.error('Firebase Storage is not initialized. Cannot upload image.');
    throw new Error('Storage service not available.');
  }
  const bucket = storage.bucket();
  const fileName = `${fileNamePrefix}-${uuidv4()}.${extension}`;
  // Use userId and promptPackageId for better organization in storage
  const filePath = `prototypes/${userId}/${promptPackageId}/${fileName}`;
  const file = bucket.file(filePath);

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
    },
  });
  // Make the file public - consider if this is always desired or if signed URLs are better
  // await file.makePublic();
  // return file.publicUrl();

  // For now, let's return a gs:// path or construct a public URL if your bucket is set up for that.
  // Using getSignedUrl for controlled access is generally safer for non-public buckets.
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '03-09-2491', // A far-future expiration date for simplicity
  });
  return signedUrl;
}

export async function POST(req: NextRequest) {
  if (!firebaseAdminApp) { // Check if Firebase Admin SDK initialized
    return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Check server logs.' }, { status: 500 });
  }

  try {
    const body = await req.json();

    let validatedInput: PromptToPrototypeInput;
    try {
      validatedInput = PromptToPrototypeInputSchema.parse(body);
    } catch (error: any) {
      // error.errors is specific to Zod validation errors
      return NextResponse.json({ error: 'Invalid input', details: error.errors || error.message }, { status: 400 });
    }

    const { prompt, imageDataUri, stylePreset } = validatedInput;
    const userId = 'anonymous_user'; // Placeholder, replace with actual user ID when auth is implemented
    const promptPackageId = uuidv4(); // Generate ID for the PromptPackage

    // Call the AI flow
    const flowOutput: PromptToPrototypeOutput = await promptToPrototype(validatedInput);

    let finalOriginalImageURL = imageDataUri; // Keep original if no upload or if it's already a URL

    // 1. Handle User-Uploaded Image (if provided as data URI)
    // The promptToPrototypeFlow received the original imageDataUri.
    // Now, if it was a data URI, we upload it to storage.
    if (imageDataUri && imageDataUri.startsWith('data:')) {
      const parts = dataUriToBuffer(imageDataUri);
      if (parts) {
        try {
          finalOriginalImageURL = await uploadImageToStorage(
            parts.buffer,
            parts.mimeType,
            parts.extension,
            userId,
            promptPackageId,
            'user-upload'
          );
        } catch (uploadError: any) {
          console.error('Failed to upload original user image:', uploadError);
          // Decide if this is a critical error. For now, we'll proceed with a null/placeholder URL.
          finalOriginalImageURL = undefined; // Or keep original data URI if preferred fallback
        }
      } else {
        console.warn('Could not parse user-provided imageDataUri. It will not be stored in Firebase Storage.');
        finalOriginalImageURL = undefined; // Or keep original data URI
      }
    }


    // 2. Handle AI-Generated Mood Board Image
    let finalMoodBoardImageURL = 'https://placehold.co/600x400.png?text=Moodboard+Failed'; // Default placeholder
    if (flowOutput.moodBoardImage && flowOutput.moodBoardImage.startsWith('data:')) {
      const parts = dataUriToBuffer(flowOutput.moodBoardImage);
      if (parts) {
        try {
          finalMoodBoardImageURL = await uploadImageToStorage(
            parts.buffer,
            parts.mimeType,
            parts.extension,
            userId,
            promptPackageId,
            'moodboard'
          );
        } catch (uploadError: any) {
          console.error('Failed to upload generated mood board image:', uploadError);
          // Use placeholder if upload fails
        }
      } else {
         console.warn('Could not parse generated moodBoardImage data URI. Using placeholder.');
      }
    } else if (flowOutput.moodBoardImage) {
        // If it's already a URL (e.g., from a previous step or external service), use it directly
        finalMoodBoardImageURL = flowOutput.moodBoardImage;
    }


    // Helper to parse shotList string (multi-line, comma-separated)
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
          shotNumber: isNaN(shotNumber) ? index + 1 : shotNumber,
          lens,
          cameraMove,
          framingNotes,
        };
      });
    };

    const moodBoardCells: MoodBoardCell[] = flowOutput.moodBoardCells.map(cell => ({
        title: cell.title,
        description: cell.description,
    }));

    // Construct PromptPackage with updated URLs
    const newPromptPackage: PromptPackage = {
      id: promptPackageId,
      userId,
      prompt,
      stylePreset,
      originalImageURL: finalOriginalImageURL, // Updated URL
      createdAt: new Date(),
      updatedAt: new Date(),
      loglines: flowOutput.loglines as Logline[],
      moodBoard: {
        generatedImageURL: finalMoodBoardImageURL, // Updated URL
        cells: moodBoardCells,
      },
      shotList: parseShotList(flowOutput.shotList),
      animaticDescription: flowOutput.proxyClipAnimaticDescription,
      pitchSummary: flowOutput.pitchSummary,
      version: 1,
    };

    // 3. Store PromptPackage in Firestore
    if (db) {
      try {
        await db.collection('promptPackages').doc(newPromptPackage.id).set(newPromptPackage);
      } catch (firestoreError: any) {
        console.error('Failed to save PromptPackage to Firestore:', firestoreError);
        // Decide if this is critical. The client will still get the package, but it won't be saved.
        // Could return a specific error or a warning. For now, log and continue.
        // Potentially, you might want to return a 500 error here as the backend state is inconsistent.
        return NextResponse.json({ error: 'Failed to save data to database.', details: firestoreError.message }, { status: 500 });
      }
    } else {
      console.warn('Firestore is not initialized. PromptPackage was not saved.');
      // This case might occur if Firebase admin init failed.
      // Consider returning an error if saving is critical.
       return NextResponse.json({ error: 'Database service not available. Data not saved.' }, { status: 500 });
    }

    return NextResponse.json(newPromptPackage, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/prototype/generate:', error);
    if (error.errors) { // Zod validation errors
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    if (error.message.includes('FlowError') || error.name === 'FlowError' || error.message.includes('promptToPrototype')) {
      return NextResponse.json({ error: 'AI flow processing error', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
