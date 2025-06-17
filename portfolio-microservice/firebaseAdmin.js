require('dotenv').config();
const admin = require('firebase-admin');

let firebaseApp;

// Check if Firebase app has already been initialized to prevent re-initialization errors
if (admin.apps.length === 0) {
  const projectId = process.env.PORTFOLIO_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.PORTFOLIO_FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.PORTFOLIO_FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Replace escaped newlines (e.g., from GitHub Secrets) with actual newlines
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Portfolio Microservice: Firebase Admin SDK initialized successfully.');
    } catch (error) {
      console.error('Portfolio Microservice: Error initializing Firebase Admin SDK:', error);
      // Optionally, re-throw or process.exit if Firebase is critical
    }
  } else {
    console.error('Portfolio Microservice: Missing Firebase Admin SDK environment variables (PROJECT_ID, CLIENT_EMAIL, or PRIVATE_KEY). SDK not initialized.');
  }
} else {
  firebaseApp = admin.app(); // Get the already initialized app
  console.log('Portfolio Microservice: Firebase Admin SDK already initialized.');
}

module.exports = admin; // Export the admin namespace for use in other parts of the application
