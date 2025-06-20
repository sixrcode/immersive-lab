// collaboration-service/src/firebaseAdmin.ts
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  // IMPORTANT: Replace with your actual service account credentials setup
  // Option 1: Environment variable GOOGLE_APPLICATION_CREDENTIALS pointing to your service account JSON file.
  // This is the recommended way for Cloud Run, Cloud Functions, etc.
  // Ensure the service account has necessary permissions for Firestore and Storage.
  try {
    admin.initializeApp({
      // credential: admin.credential.applicationDefault(), // Use this if GOOGLE_APPLICATION_CREDENTIALS is set
      // If not using GOOGLE_APPLICATION_CREDENTIALS, you might explicitly load a service account key:
      // credential: admin.credential.cert(require('./path/to/your/serviceAccountKey.json')),
      // projectId: 'your-project-id', // Optionally specify projectId if not inferred
    });
    console.log('Firebase Admin SDK initialized in collaboration-service.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error in collaboration-service:', error);
    // If using GOOGLE_APPLICATION_CREDENTIALS, make sure it's correctly set in the environment.
    // If loading a key file, ensure the path is correct and the file exists.
    // Consider that `require` path is relative to the JS file at runtime.
    // For local dev, you might place the key file in `collaboration-service/src` and use:
    // credential: admin.credential.cert(require('./serviceAccountKey.json')),
    // BUT DO NOT COMMIT THE KEY FILE TO GIT. Use .gitignore.
    // For now, we'll proceed assuming default credentials or environment setup.
    // If running locally without GOOGLE_APPLICATION_CREDENTIALS, this will likely fail
    // unless you explicitly provide credentials as shown above.
    // For the purpose of this subtask, we will allow it to proceed if initialization fails
    // but log a prominent error. The actual Firestore calls will then fail.
     admin.initializeApp(); // Attempt default initialization
     console.warn('Firebase Admin SDK initialized with default options. Ensure GOOGLE_APPLICATION_CREDENTIALS is set for proper authentication.');

  }
}

export const db = admin.firestore();
export const storage = admin.storage();

export default admin;
