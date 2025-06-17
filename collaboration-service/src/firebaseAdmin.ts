import * as admin from 'firebase-admin';

const initializeFirebaseAdmin = () => {
  try {
    const projectId = process.env.COLLAB_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.COLLAB_FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.COLLAB_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Firebase Admin SDK initialization error: Missing required environment variables.');
      throw new Error('Missing Firebase credentials in environment variables.');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
    throw error; // Re-throw the error to halt startup if initialization fails
  }
};

initializeFirebaseAdmin();

export { admin };
export const auth = admin.auth();
export const firestore = admin.firestore();
