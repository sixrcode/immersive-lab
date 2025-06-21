import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { CommentSchema } from '@/lib/feedback-types';
import { initializeAdminApp } from '@/lib/firebase/admin'; // Ensure admin app is initialized

export async function POST(request: Request) {
  try {
    await initializeAdminApp(); // Ensure Firebase Admin is initialized

    const authorizationHeader = request.headers.get('Authorization');
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized: Missing or invalid token', code: 'UNAUTHENTICATED' } }, { status: 401 });
    }
    const idToken = authorizationHeader.split('Bearer ')[1];

    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
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

    const commentRef = await adminDb.collection('project_comments').add(newComment);

    return NextResponse.json({ success: true, data: { id: commentRef.id, ...newComment } }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error submitting comment:', error);
    return NextResponse.json({ success: false, error: { id: 'unknown-error', message: error.message || 'Failed to submit comment.', code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 });
  }
}
