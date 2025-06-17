import { NextRequest, NextResponse } from 'next/server';
import { StoryboardGeneratorInputSchema, StoryboardGeneratorInput } from '@/lib/ai-types'; // Updated import
import { firebaseAdminApp } from '@/lib/firebase/admin';

const AI_MICROSERVICE_URL = process.env.NEXT_PUBLIC_AI_MICROSERVICE_URL;

export async function POST(req: NextRequest): Promise<NextResponse> {
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
    validatedInput = StoryboardGeneratorInputSchema.parse(body);
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Invalid input', details: error instanceof Error ? error.message : 'Unknown validation error' }, { status: 400 });
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
    const microserviceResponse = await fetch(`${AI_MICROSERVICE_URL}/generateStoryboard`, {
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
      } catch (e) { /* Ignore */ }
      console.error('Error from AI microservice (generateStoryboard):', microserviceResponse.status, errorBody);
      return NextResponse.json(
        { error: 'AI service request failed (storyboard generation).', details: errorBody || microserviceResponse.statusText },
        { status: microserviceResponse.status }
      );
    }

    const storyboardResult = await microserviceResponse.json();
    return NextResponse.json(storyboardResult, { status: 200 });

  } catch (error: unknown) {
    console.error('Error calling AI microservice (generateStoryboard) or processing its response:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error contacting AI service for storyboard generation.' }, { status: 500 });
  }
}
