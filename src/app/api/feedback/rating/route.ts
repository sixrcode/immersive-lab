import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { RatingSchema } from '@/lib/feedback-types';
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
    const parsedRating = RatingSchema.safeParse({
      ...body,
      userId, // Add userId to the object being parsed
      timestamp: new Date(), // Add server-side timestamp
    });

    if (!parsedRating.success) {
      console.error('Validation errors:', parsedRating.error.flatten());
      return NextResponse.json({ success: false, error: { message: 'Invalid rating data', code: 'VALIDATION_ERROR', details: parsedRating.error.flatten() } }, { status: 400 });
    }

    const { projectId, value } = parsedRating.data;

    // Store individual rating
    const newRatingDoc = {
      projectId,
      userId,
      value,
      timestamp: FieldValue.serverTimestamp(),
    };
    const ratingRef = await adminDb.collection('project_ratings').add(newRatingDoc);

    // Update aggregated rating in a separate document or collection
    // For simplicity, let's assume a 'projects_aggregated_ratings' collection
    // Document ID can be the projectId
    const aggregatedRatingRef = adminDb.collection('projects_aggregated_ratings').doc(projectId);

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(aggregatedRatingRef);
      if (!doc.exists) {
        transaction.set(aggregatedRatingRef, {
          totalRating: value,
          ratingCount: 1,
          averageRating: value,
          projectId, // Store projectId for easier querying if needed
          lastUpdated: FieldValue.serverTimestamp(),
        });
      } else {
        const data = doc.data();
        if (data) {
            const newTotalRating = (data.totalRating || 0) + value;
            const newRatingCount = (data.ratingCount || 0) + 1;
            transaction.update(aggregatedRatingRef, {
                totalRating: newTotalRating,
                ratingCount: newRatingCount,
                averageRating: newTotalRating / newRatingCount,
                lastUpdated: FieldValue.serverTimestamp(),
            });
        }
      }
    });

    return NextResponse.json({ success: true, data: { id: ratingRef.id, ...newRatingDoc } }, { status: 201 });
  } catch (error: any) {
    console.error('Error submitting rating:', error);
    return NextResponse.json({ success: false, error: { id: 'unknown-error', message: error.message || 'Failed to submit rating.', code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 });
  }
}
