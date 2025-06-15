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

let db: admin.firestore.Firestore;
let storage: admin.storage.Storage;
let app: admin.app.App;

if (!admin.apps.length) {
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
    } catch (error: any) {
      console.error('Firebase Admin SDK initialization error:', error.message);
      // Optionally, throw the error or handle it as per your application's needs
      // throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
    }
  } else {
    console.warn(
      'Firebase Admin SDK not initialized. Missing one or more required environment variables: ' +
      'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET. ' +
      'Firestore and Storage operations will not be available.'
    );
    // Fallback for environments where SDK isn't (or can't be) initialized,
    // e.g. during build time or in some testing scenarios.
    // You might want to use mock instances here if your app needs to run without full Firebase access.
  }
} else {
  app = admin.app(); // Get the default app if already initialized
  console.log('Firebase Admin SDK already initialized.');
}

// Ensure app is defined before trying to access db and storage
if (app!) {
  db = admin.firestore(app);
  storage = admin.storage(app);
} else {
  // If app is still not defined (initialization failed or skipped),
  // provide a clear warning or error.
  // Depending on your app's requirements, you might throw an error here
  // or use mock/stub instances for db and storage.
  console.error(
    'Firebase Admin App is not initialized. Firestore and Storage are not available. ' +
    'This may be due to missing environment variables or an initialization error.'
  );
  // Example of how you might use stubs if needed, though this is often better handled with proper DI or mocking frameworks.
  // db = { /* mock Firestore methods */ } as unknown as admin.firestore.Firestore;
  // storage = { /* mock Storage methods */ } as unknown as admin.storage.Storage;
}


export { db, storage, app as firebaseAdminApp };
