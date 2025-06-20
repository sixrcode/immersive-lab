import { NextRequest, NextResponse } from 'next/server';
import { FeedbackReportSchema } from '@/lib/feedback-types';
import { db, firebaseAdminApp } from '@/lib/firebase/admin'; // Assuming firebaseAdminApp is initialized and exported from here

export async function POST(request: NextRequest) {
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

  } catch (error: any) {
    console.error('Error processing feedback report:', error);
    // Differentiate between known error types and unknown ones if necessary
    if (error.type === 'FirebaseAuthError') { // Example, adjust based on actual errors
        return NextResponse.json({ error: 'Forbidden, token verification failed' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error', message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
