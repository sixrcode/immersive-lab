import * as admin from 'firebase-admin';

// It's crucial to set these environment variables in your deployment environment.
// For local development, you might use a .env file (make sure it's in .gitignore)
// or set them directly in your shell.
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
// The private key needs to be a single string, often stored with escaped newlines (e.g., in a GitHub Secret).
// When reading from process.env, these escaped newlines should be converted back to actual newlines.
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET; // e.g., your-project-id.appspot.com

let db: admin.firestore.Firestore | undefined;
let storage: admin.storage.Storage | undefined;
let app: admin.app.App | undefined;

if (!admin.apps.length) {
  // Add this block for detailed logging in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    console.log('Firebase Admin SDK Initialization Check (Non-Production):');
    console.log(`  FIREBASE_PROJECT_ID: ${FIREBASE_PROJECT_ID ? 'Present' : 'MISSING'}`);
    console.log(`  FIREBASE_CLIENT_EMAIL: ${FIREBASE_CLIENT_EMAIL ? 'Present' : 'MISSING'}`);
    console.log(`  FIREBASE_PRIVATE_KEY: ${process.env.FIREBASE_PRIVATE_KEY ? 'Present (not displaying value)' : 'MISSING'}`); // Check original env var for presence
    console.log(`  FIREBASE_STORAGE_BUCKET: ${FIREBASE_STORAGE_BUCKET ? 'Present' : 'MISSING'}`);
  }

  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY && FIREBASE_STORAGE_BUCKET) {
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY,
        }),
        storageBucket: FIREBASE_STORAGE_BUCKET,
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during Firebase Admin SDK initialization';
      console.error('Firebase Admin SDK initialization error:', errorMessage);
      app = undefined;
    }
  } else {
    const missingVariables: string[] = [];
    if (!FIREBASE_PROJECT_ID) missingVariables.push('FIREBASE_PROJECT_ID');
    if (!FIREBASE_CLIENT_EMAIL) missingVariables.push('FIREBASE_CLIENT_EMAIL');
    if (!process.env.FIREBASE_PRIVATE_KEY) missingVariables.push('FIREBASE_PRIVATE_KEY'); // Check original env var
    if (!FIREBASE_STORAGE_BUCKET) missingVariables.push('FIREBASE_STORAGE_BUCKET');

    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('!!! FIREBASE ADMIN SDK INITIALIZATION SKIPPED DUE TO MISSING ENV VARIABLES !!!');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('The following required environment variables are missing:');
    missingVariables.forEach(variable => console.error(`  - ${variable}`));
    console.error('Firebase features like Firestore and Storage will NOT be available.');
    app = undefined;
  }
} else {
  app = admin.app(); // Get the default app if already initialized
  console.log('Firebase Admin SDK already initialized.');
}

if (app) {
  db = admin.firestore(app);
  storage = admin.storage(app);
}

export { db, storage, app as firebaseAdminApp };
