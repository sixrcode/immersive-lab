import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';

export async function GET(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ success: false, error: { message: 'projectId query parameter is required', code: 'MISSING_PROJECT_ID' } }, { status: 400 });
    }

    // Fetch aggregated rating data
    const aggregatedRatingRef = db.collection('projects_aggregated_ratings').doc(projectId);
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching ratings:', error);
    return NextResponse.json({ success: false, error: { id: 'unknown-error', message: errorMessage, code: 'INTERNAL_SERVER_ERROR' } }, { status: 500 });
  }
}
