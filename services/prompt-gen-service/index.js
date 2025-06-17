const express = require('express');
const functions = require('@google-cloud/functions-framework');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Local module imports
const { PromptToPrototypeInputSchema, promptToPrototype } = require('./prompt-to-prototype.flow.js');
const { dataUriToBuffer, uploadImageToStorage } = require('./utils.js');
// Note: Genkit's 'ai' object is configured in genkit.js and used by prompt-to-prototype.flow.js

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

// Main route for generating prototype assets
app.post('/generate', async (req, res) => {
  try {
    // 1. Validate the incoming request body against the Zod schema.
    let validatedInput;
    try {
      validatedInput = PromptToPrototypeInputSchema.parse(req.body);
    } catch (error) {
      // If validation fails, return a 400 error with details.
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }

    const { prompt, imageDataUri, stylePreset } = validatedInput;

    // 2. Define identifiers for storage paths (user ID is a placeholder).
    const userId = "microservice-user"; // Placeholder for user identification
    const promptPackageId = uuidv4(); // Unique ID for this set of generated assets

    let uploadedUserImageURL = imageDataUri; // Initialize with original URI (could be a URL or data URI)

    // 3. Handle user-uploaded image (if provided as a data URI).
    // This involves parsing the data URI and uploading the image buffer to Firebase Storage.
    if (imageDataUri && imageDataUri.startsWith('data:')) {
      const parts = dataUriToBuffer(imageDataUri); // Parse data URI to get buffer, mimeType, etc.
      if (parts && storage) { // Proceed if parsing was successful and Firebase Storage is available
        try {
          uploadedUserImageURL = await uploadImageToStorage(
            parts.buffer,
            parts.mimeType,
            parts.extension,
            userId,
            promptPackageId,
            'user-upload', // File name prefix
            storage         // Pass the initialized Firebase Storage object
          );
          console.log("User image uploaded successfully:", uploadedUserImageURL);
        } catch (uploadError) {
          console.error('Failed to upload original user image:', uploadError);
          // Non-critical error for now: the flow can proceed without the uploaded image URL,
          // using the original data URI or a placeholder if the flow itself handles that.
          // `uploadedUserImageURL` retains its original value (the data URI).
        }
      } else if (!storage) {
        console.error('Firebase Storage not available, cannot upload user image.');
      } else {
        // This case means dataUriToBuffer returned null.
        console.warn('Could not parse user-provided imageDataUri for upload. It might be malformed.');
      }
    }

    // 4. Prepare the input for the Genkit flow.
    // Use the (potentially new) URL for the user-uploaded image.
    const flowInput = {
      ...validatedInput,
      imageDataUri: uploadedUserImageURL
    };

    // 5. Execute the main AI flow (`promptToPrototype`) to generate creative assets.
    // This flow is defined in `prompt-to-prototype.flow.js` and uses Genkit.
    const flowOutput = await promptToPrototype(flowInput);
    if (!flowOutput) {
      // This should ideally not happen if the flow is robust.
      throw new Error('Prompt to prototype flow did not return expected output.');
    }

    // 6. Handle the AI-generated mood board image.
    // This image is returned by the flow as a data URI and needs to be uploaded to Firebase Storage.
    let generatedMoodboardImageURL = 'https://placehold.co/600x400.png?text=Moodboard+Gen+Failed'; // Default placeholder
    if (flowOutput.moodBoardImage && flowOutput.moodBoardImage.startsWith('data:') && storage) {
      const parts = dataUriToBuffer(flowOutput.moodBoardImage);
      if (parts) {
        try {
          generatedMoodboardImageURL = await uploadImageToStorage(
            parts.buffer,
            parts.mimeType,
            parts.extension,
            userId,
            promptPackageId,
            'moodboard', // File name prefix
            storage        // Pass the initialized Firebase Storage object
          );
          console.log("AI-generated mood board image uploaded successfully:", generatedMoodboardImageURL);
        } catch (uploadError) {
          console.error('Failed to upload generated mood board image:', uploadError);
          // If upload fails, the default placeholder URL will be used.
        }
      } else {
         console.warn('Could not parse generated moodBoardImage data URI for upload. It might be malformed.');
      }
    } else if (flowOutput.moodBoardImage) {
      // If moodBoardImage is already a URL (e.g., a placeholder from the flow itself), use it directly.
      generatedMoodboardImageURL = flowOutput.moodBoardImage;
    } else if (!storage) {
        console.error('Firebase Storage not available, cannot upload AI-generated moodboard image.');
    }

    // 7. Construct the final response payload.
    // This includes all assets from the flow, with image data URIs replaced by their public URLs.
    const responsePayload = {
      ...flowOutput, // Spread all properties from flowOutput
      moodBoardImage: generatedMoodboardImageURL,    // Override with the public URL
      originalUserImageURL: uploadedUserImageURL, // Add the public URL of the user's original image
    };

    // 8. Send the successful response.
    return res.status(200).json(responsePayload);

  } catch (error) {
    // Catch-all error handler for the /generate route.
    console.error('Error in /generate route:', error);
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Return a 500 Internal Server Error response.
    return res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
  }
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
functions.http('promptGenServiceHttp', app);

// Note on module.exports:
// While `functions.http` is the primary export for Google Cloud Functions,
// exporting `app` and Firebase services can be useful for local testing or alternative deployment scenarios.
// However, for a pure GCF deployment, only the `functions.http` export is strictly necessary.
module.exports = { app, db, storage, admin };
