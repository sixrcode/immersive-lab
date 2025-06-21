import { NextRequest, NextResponse } from 'next/server';
import { FeedbackReportSchema } from '@/lib/feedback-types';
import { db, firebaseAdminApp } from '@/lib/firebase/admin'; // Assuming firebaseAdminApp is initialized and exported from here

export async function POST(request: NextRequest) {
  if (!firebaseAdminApp || !db) {
    console.error('Firebase Admin SDK not initialized. Check server environment variables.');
    return NextResponse.json({ success: false, error: { message: 'Required backend services are not available.', code: 'SERVICE_UNAVAILABLE' } }, { status: 503 });
  }

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized, malformed token' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await firebaseAdminApp.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return NextResponse.json({ error: 'Forbidden, invalid token' }, { status: 403 });
    }

    const userId = decodedToken.uid;
    const requestBody = await request.json();

    // Merge userId into the body for validation
    const dataToValidate = { ...requestBody, userId };

    const parseResult = await FeedbackReportSchema.safeParseAsync(dataToValidate);

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Bad Request', details: parseResult.error.format() }, { status: 400 });
    }

    const validatedData = parseResult.data;

    // Generate a new ID and set server-side timestamp
    const newReportRef = db.collection('feedbackReports').doc();
    const newReport = {
      ...validatedData,
      id: newReportRef.id,
      timestamp: new Date(), // Server-side timestamp
    };

    await newReportRef.set(newReport);

    return NextResponse.json(newReport, { status: 201 });

  } catch (error: unknown) {
    console.error('Error processing feedback report:', error);
    let message = 'An unexpected error occurred.';
    let code = 'INTERNAL_SERVER_ERROR'; // Default error code

    if (error instanceof Error) {
      message = error.message;
      // Check for specific error types if needed, e.g., Firebase errors
      // This is a generic example; you might need to refine based on actual Firebase error object structure
      if (error instanceof Error && 'code' in error && typeof (error as {code?: string}).code === 'string') {
        // Attempt to use Firebase error codes if available
        // This is a common pattern but might need adjustment based on the exact error object structure
        const firebaseErrorCode = (error as {code?: string}).code;
        if (firebaseErrorCode && firebaseErrorCode.startsWith('auth/')) {
          // More specific handling for auth errors
          message = 'Forbidden, token verification failed.';
          code = firebaseErrorCode; // Use the specific Firebase auth error code
          return NextResponse.json({ error: message, code }, { status: 403 });
        }
      }
    }
    // For generic errors or if specific checks don't match
    return NextResponse.json({ error: 'Internal Server Error', message, code }, { status: 500 });
  }
}
