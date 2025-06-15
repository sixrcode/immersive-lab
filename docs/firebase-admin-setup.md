# Firebase Admin SDK Setup

The Firebase Admin SDK is used in this project to interact with Firebase services from server-side environments. It is initialized in `src/lib/firebase/admin.ts`.

## Environment Variables

To use the Firebase Admin SDK, you need to set the following environment variables in your development and deployment environments:

*   `FIREBASE_PROJECT_ID`: Your Firebase project ID.
*   `FIREBASE_CLIENT_EMAIL`: The client email address from your Firebase service account credentials.
*   `FIREBASE_PRIVATE_KEY`: The private key from your Firebase service account credentials. **Important:** When setting this variable, especially in environments like GitHub Secrets or `.env` files, ensure that newline characters (`\n`) within the key are properly escaped if necessary, or pasted as a multi-line string if the environment supports it. The initialization script (`src/lib/firebase/admin.ts`) handles replacing `\n` with actual newlines.
*   `FIREBASE_STORAGE_BUCKET`: Your Firebase project's storage bucket URL (e.g., `your-project-id.appspot.com`).

### Obtaining Credentials

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project.
3.  Go to **Project settings** (click the gear icon next to Project Overview).
4.  Navigate to the **Service accounts** tab.
5.  Click on **Generate new private key** and confirm. A JSON file containing your service account credentials will be downloaded.
    *   The `project_id` in this JSON file is your `FIREBASE_PROJECT_ID`.
    *   The `client_email` in this JSON file is your `FIREBASE_CLIENT_EMAIL`.
    *   The `private_key` in this JSON file is your `FIREBASE_PRIVATE_KEY`.
6.  To find your `FIREBASE_STORAGE_BUCKET`:
    *   In the Firebase Console, go to **Storage**.
    *   You'll see your bucket URL at the top of the Files tab (it usually looks like `gs://<your-project-id>.appspot.com`). Your `FIREBASE_STORAGE_BUCKET` is `<your-project-id>.appspot.com`.

### Setting Environment Variables

#### Local Development

You can use a `.env` file at the root of your project to store these variables for local development. Make sure `.env` is listed in your `.gitignore` file to prevent committing secrets.

Example `.env` file:

```
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="your-service-account-email@your-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT_WITH_ESCAPED_NEWLINES\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
```

**Note on `FIREBASE_PRIVATE_KEY` format:** The private key from the JSON file needs to be a single string with `
` for newlines when used in a typical `.env` file. Some systems or libraries might handle multi-line variables directly.

#### Deployment

For deployment, consult your hosting provider's documentation on how to set environment variables (e.g., Vercel Environment Variables, Google Cloud Function environment variables, etc.).

## Using the Admin SDK

Once the environment variables are set, the Admin SDK will be automatically initialized. You can import the Firestore database instance (`db`) and Storage instance (`storage`) from `src/lib/firebase/admin.ts`:

```typescript
import { db, storage } // Or firebaseAdminApp for the app instance
from '@/lib/firebase/admin';

// Example: Access Firestore
async function getUsers() {
  const usersSnapshot = await db.collection('users').get();
  usersSnapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}

// Example: Access Storage (e.g., list files in root)
async function listFiles() {
  try {
    const [files] = await storage.bucket().getFiles();
    files.forEach(file => {
      console.log(file.name);
    });
  } catch (error) {
    console.error('Error listing files:', error);
  }
}
```
