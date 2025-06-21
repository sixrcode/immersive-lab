import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { initializeAdminApp } from '@/lib/firebase/admin'; // Ensure admin app is initialized

export async function GET(request: Request) {
  try {
    await initializeAdminApp(); // Ensure Firebase Admin is initialized

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: { message: 'projectId query parameter is required', code: 'MISSING_PROJECT_ID' } }, { status: 400 });
    }

    const commentsSnapshot = await adminDb.collection('project_comments')
      .where('projectId', '==', projectId)
      .orderBy('timestamp', 'desc')
      .get();

    if (commentsSnapshot.empty) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    const comments = commentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to ISO string or milliseconds if needed by client
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : null,
      };
    });

    return NextResponse.json({ success: true, data: comments }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ success: false, error: { id: 'unknown-error', message: error.message || 'Failed to fetch comments.', code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 });
  }
}
