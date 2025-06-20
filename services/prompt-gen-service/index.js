const express = require('express');
const functions = require('@google-cloud/functions-framework');
const admin = require('firebase-admin');

// Note: Genkit's 'ai' object is configured in genkit.js and used by prompt-to-prototype.flow.js
// ^ This comment will be outdated after genkit.js is removed.

// Initialize Firebase Admin SDK
let db, storage;
try {
  // Initializes Firebase Admin SDK using Application Default Credentials.
  // This is suitable for environments like Google Cloud Functions or Cloud Run
  // where credentials are automatically provided or via GOOGLE_APPLICATION_CREDENTIALS env var.
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Optionally specify the storage bucket, e.g., 'your-project-id.appspot.com'
    // If not specified, it uses the default bucket associated with the project.
    // storageBucket: 'YOUR_STORAGE_BUCKET_URL'
  });
  db = admin.firestore(); // Firestore database instance (currently not used extensively in this service)
  storage = admin.storage(); // Firebase Storage instance for image uploads
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Firebase Admin SDK initialization failed:", error);
  // The service might not function correctly if Firebase interactions are critical.
  // For example, image uploads will fail if 'storage' is not initialized.
}

const app = express();
const port = process.env.PORT || 8080;

// Middleware
// Increase JSON payload limit to accommodate base64 encoded images (e.g., imageDataUri).
app.use(express.json({ limit: '50mb' }));

// Simple health check route
app.get('/', (req, res) => {
  res.send('Prompt Generation Service is running!');
});

// Start the Express server only if not running in a serverless environment (like Google Cloud Functions).
// The K_SERVICE environment variable is commonly set in Cloud Run and Google Cloud Functions v2.
// NODE_ENV !== 'test' is a common practice to avoid starting the server during tests.
if (process.env.NODE_ENV !== 'test' && !process.env.K_SERVICE) {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

// Export the Express app for potential use with Google Cloud Functions.
// The name 'promptGenServiceHttp' should match the function name configured in Google Cloud.
// Deprecated: HTTP trigger disabled as this service's functionality is now part of ai-microservice.
// functions.http('promptGenServiceHttp', app);

// Note on module.exports:
// While `functions.http` is the primary export for Google Cloud Functions,
// exporting `app` and Firebase services can be useful for local testing or alternative deployment scenarios.
// However, for a pure GCF deployment, only the `functions.http` export is strictly necessary.
module.exports = { app, db, storage, admin };
