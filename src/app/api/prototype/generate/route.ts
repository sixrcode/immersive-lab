import { NextRequest, NextResponse } from 'next/server';
import { PromptToPrototypeInputSchema, PromptToPrototypeInput } from '@/lib/ai-types'; // Updated import
// Types like PromptPackage might still be useful for typing the response from the microservice
import type { PromptPackage } from '@/lib/types';
import { firebaseAdminApp } from '@/lib/firebase/admin'; // Keep for checking admin SDK init, potentially for getting ID token server-side if needed

// Ensure this is set in your .env.local or environment variables
const AI_MICROSERVICE_URL = process.env.NEXT_PUBLIC_AI_MICROSERVICE_URL;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!firebaseAdminApp) {
    return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Check server logs.' }, { status: 500 });
  }

  if (!AI_MICROSERVICE_URL) {
    console.error('AI_MICROSERVICE_URL is not set in environment variables.');
    return NextResponse.json({ error: 'Service configuration error.' }, { status: 500 });
  }

  let validatedInput: PromptToPrototypeInput;
  try {
    const body = await req.json();
    validatedInput = PromptToPrototypeInputSchema.parse(body);
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Invalid input', details: error instanceof Error ? error.message : 'Unknown validation error' }, { status: 400 });
  }

  // Get Firebase ID token from the client's request to this Next.js API route
  // The client should send this in the Authorization header.
  const authorizationHeader = req.headers.get('Authorization');
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized. No Bearer token provided to Next.js API route.' }, { status: 401 });
  }
  const idToken = authorizationHeader.split('Bearer ')[1];
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized. Bearer token is empty.' }, { status: 401 });
  }

  try {
    // Make a POST request to the AI microservice's /promptToPrototype endpoint
    const microserviceResponse = await fetch(`${AI_MICROSERVICE_URL}/promptToPrototype`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`, // Forward the user's ID token
      },
      body: JSON.stringify(validatedInput), // Send the validated input
    });

    if (!microserviceResponse.ok) {
      // Attempt to parse error response from microservice
      let errorBody = null;
      try {
        errorBody = await microserviceResponse.json();
      } catch (e) {
        // Ignore if error body is not JSON
      }
      console.error('Error from AI microservice:', microserviceResponse.status, errorBody);
      return NextResponse.json(
        { error: 'AI service request failed.', details: errorBody || microserviceResponse.statusText },
        { status: microserviceResponse.status }
      );
    }

    // The microservice is expected to return the complete PromptPackage data
    const promptPackageFromMicroservice: PromptPackage = await microserviceResponse.json();

    // Return the response from the microservice to the client
    return NextResponse.json(promptPackageFromMicroservice, { status: 200 });

  } catch (error: unknown) {
    console.error('Error calling AI microservice or processing its response:', error);
    let errorMessage = 'An internal server error occurred while contacting the AI service.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
