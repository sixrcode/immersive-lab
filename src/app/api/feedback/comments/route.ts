import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin'; // Ensure admin app is initialized and adminDb is imported
import { DocumentSnapshot } from 'firebase-admin/firestore';

export async function GET(request: Request): Promise<NextResponse> {
  try {

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: { message: 'projectId query parameter is required', code: 'MISSING_PROJECT_ID' } }, { status: 400 });
    }

    const commentsSnapshot = await db.collection('project_comments')
      .where('projectId', '==', projectId)
      .orderBy('timestamp', 'desc')
      .get();

    if (commentsSnapshot.empty) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    const comments = commentsSnapshot.docs.map((doc: DocumentSnapshot) => {
      const data = doc.data() as { projectId: string; userId: string; text: string; timestamp: { toDate: () => Date } }; // Cast data to expected type
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to ISO string or milliseconds if needed by client
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : undefined, // Use undefined for missing timestamp
      };
    });

    return NextResponse.json({ success: true, data: comments }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching comments:', error);
    let errorMessage = 'Failed to fetch comments.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: { id: 'unknown-error', message: errorMessage, code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 });
  }
}
