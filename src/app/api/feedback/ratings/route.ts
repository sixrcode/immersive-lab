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

    // Fetch aggregated rating data
    const aggregatedRatingRef = adminDb.collection('projects_aggregated_ratings').doc(projectId);
    const doc = await aggregatedRatingRef.get();

    if (!doc.exists) {
      return NextResponse.json({
        success: true,
        data: {
          projectId,
          averageRating: 0,
          ratingCount: 0,
          totalRating: 0, // explicitly state totalRating is 0
        }
      }, { status: 200 });
    }

    const aggregatedData = doc.data();

    // Optionally, fetch individual ratings if needed, though typically aggregated is enough for display
    // const individualRatingsSnapshot = await adminDb.collection('project_ratings')
    //   .where('projectId', '==', projectId)
    //   .orderBy('timestamp', 'desc') // Example ordering
    //   .get();
    // const individualRatings = individualRatingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        averageRating: aggregatedData?.averageRating || 0,
        ratingCount: aggregatedData?.ratingCount || 0,
        totalRating: aggregatedData?.totalRating || 0, // ensure totalRating is part of response
        // individualRatings: individualRatings // if you decide to fetch them
      }
    }, { status: 200 });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching ratings:', error);
    return NextResponse.json({ success: false, error: { id: 'unknown-error', message: errorMessage, code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 });
  }
}
