import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase/admin';
import { CommentSchema } from '@/lib/feedback-types';

export async function POST(request: Request) {

    const authorizationHeader = request.headers.get('Authorization');
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized: Missing or invalid token', code: 'UNAUTHENTICATED' } }, { status: 401 });
    }

 const idToken = authorizationHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error); // Handle unknown error type
      return NextResponse.json({ success: false, error: { message: 'Unauthorized: Invalid token', code: 'INVALID_TOKEN' } }, { status: 401 });
    }

    const userId = decodedToken.uid;
    if (!userId) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized: User ID not found in token', code: 'USER_ID_MISSING' } }, { status: 401 });
    }

    const body = await request.json();
    const parsedComment = CommentSchema.safeParse({
      ...body,
      userId, // Add userId to the object being parsed
      timestamp: new Date(), // Add server-side timestamp
    });

    if (!parsedComment.success) {
      console.error('Validation errors:', parsedComment.error.flatten());
      return NextResponse.json({ success: false, error: { message: 'Invalid comment data', code: 'VALIDATION_ERROR', details: parsedComment.error.flatten() } }, { status: 400 });
    }

    const newComment = {
      ...parsedComment.data,
      timestamp: FieldValue.serverTimestamp(), // Use Firestore server timestamp
    };

 if (db === undefined) {
 console.error('Firebase Admin DB not initialized.');
 return NextResponse.json({ success: false, error: { id: 'db-not-initialized', message: 'Database not available.', code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 });
 }
    try { // Start the try block here
    const commentRef = await db.collection('project_comments').add(newComment);

    return NextResponse.json({ success: true, data: { id: commentRef.id, ...newComment } }, { status: 201 });
  } catch (error) {
    console.error('Error submitting comment:', error); // Handle unknown error type
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'; // Handle unknown error type
 return NextResponse.json({ success: false, error: { id: 'unknown-error', message: errorMessage, code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 });
  }
}