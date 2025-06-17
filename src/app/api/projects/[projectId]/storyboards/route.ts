// src/app/api/projects/[projectId]/storyboards/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { firebaseAdminApp } from '@/lib/firebase/admin'; // Ensure this path is correct
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { StoryboardPackage } from '../../../../../../../packages/types/src/storyboard.types'; // Adjust path as necessary

// Initialize Firebase Admin components if not already done in admin.ts
let adminAuth: ReturnType<typeof getAuth>;
let adminFirestore: ReturnType<typeof getFirestore>;

if (firebaseAdminApp) {
  adminAuth = getAuth(firebaseAdminApp);
  adminFirestore = getFirestore(firebaseAdminApp);
} else {
  // This block should ideally not be reached if firebaseAdminApp is correctly initialized globally
  console.error("Firebase Admin SDK not initialized at API route level. Ensure '@/lib/firebase/admin' is correctly configured.");
  // You might throw an error here or attempt a last-minute initialization if critical
}

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  if (!firebaseAdminApp) {
    return NextResponse.json({ error: 'Firebase Admin SDK not initialized.' }, { status: 500 });
  }

  try {
    // Authentication
    const authorizationHeader = req.headers.get('Authorization');
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. No Bearer token provided.' }, { status: 401 });
    }
    const idToken = authorizationHeader.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized. Bearer token is empty.' }, { status: 401 });
    }

    try {
      await adminAuth.verifyIdToken(idToken);
      // TODO: Add further authorization checks:
      // e.g., verify if the authenticated user (decodedToken.uid) has access to this projectId.
      // This might involve checking a 'projectMembers' collection or similar.
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return NextResponse.json({ error: 'Unauthorized. Invalid ID token.' }, { status: 403 });
    }

    // Input Validation
    const { projectId } = params;
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      return NextResponse.json({ error: 'Invalid or missing projectId.' }, { status: 400 });
    }

    // Fetch Storyboards from Firestore
    const storyboardsQuery = adminFirestore
      .collection('storyboards')
      .where('projectId', '==', projectId);

    const querySnapshot = await storyboardsQuery.get();

    if (querySnapshot.empty) {
      return NextResponse.json([], { status: 200 }); // Return empty array if no storyboards found
    }

    const storyboards: StoryboardPackage[] = [];
    querySnapshot.forEach(doc => {
      storyboards.push(doc.data() as StoryboardPackage);
    });

    return NextResponse.json(storyboards, { status: 200 });

  } catch (error: unknown) {
    console.error('Error fetching storyboards by projectId:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ error: 'Failed to fetch storyboards.', details: errorMessage }, { status: 500 });
  }
}
