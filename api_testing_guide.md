# API Testing Guide with Firebase Emulator Suite

This guide explains how to set up the Firebase Emulator Suite and test your Cloud Functions API locally.

## 1. Install/Update Firebase Emulator Suite Components

If you haven't installed the emulators or want to ensure they are up-to-date, run the following commands in your project directory:

```bash
firebase setup:emulators:functions
firebase setup:emulators:firestore
firebase setup:emulators:auth
```
These commands will download the necessary emulator binaries.

## 2. Configure `firebase.json` for Emulators

Your `firebase.json` file needs to be configured to tell the Firebase CLI which emulators to run and on which ports. Add or update the `emulators` section in your `firebase.json` as follows:

```json
{
  // ... other firebase.json configurations like "functions" and "hosting" ...
  "emulators": {
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "auth": {
      "port": 9099
    },
    "hosting": {
      "port": 5000
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

*   **`functions`**: Configures the Functions emulator. Port `5001` is standard.
*   **`firestore`**: Configures the Firestore emulator. Port `8080` is standard. (Included even if your current functions don't heavily use it, for future development).
*   **`auth`**: Configures the Auth emulator. Port `9099` is standard. This is crucial for testing authentication.
*   **`hosting`**: Configures the Hosting emulator. Port `5000` is standard. This is useful if you have hosting rewrites to functions.
*   **`ui`**: Enables the Emulator UI. Port `4000` is the default. The Emulator UI provides a graphical interface to view emulator status, manage data in Firestore, manage users in Auth, view logs, etc.

**Important**: Ensure this `emulators` block is a top-level key in your `firebase.json`, alongside `functions`, `hosting`, etc.

## 3. Start the Emulators

Once configured, start all emulators by running the following command in your project directory:

```bash
firebase emulators:start
```

This command will:
*   Start all emulators defined in the `emulators` section of `firebase.json`.
*   Output logs from each emulator, including the URLs where they are accessible.
*   The Functions emulator will typically make your HTTP functions available at a URL like `http://localhost:5001/YOUR_PROJECT_ID/YOUR_REGION/FUNCTION_NAME` or `http://127.0.0.1:5001/YOUR_PROJECT_ID/YOUR_REGION/FUNCTION_NAME`.
    *   For the `api` function (our Express app), the base URL will be similar to: `http://localhost:5001/YOUR_PROJECT_ID/us-central1/api`
    *   For the `helloWorld` function: `http://localhost:5001/YOUR_PROJECT_ID/us-central1/helloWorld`
*   **Replace `YOUR_PROJECT_ID` with your actual Firebase project ID and `us-central1` with your function's region if it's different.** You can often find your project ID in the `.firebaserc` file or the Firebase console. For local testing, `demo-project` is often used as a placeholder if no specific project is configured for emulation.

The Emulator UI will be accessible at `http://localhost:4000`.

## 4. Test API Endpoints with `curl`

Use the following `curl` commands to test your API endpoints. Remember to replace `YOUR_PROJECT_ID` in the URLs.

**a. Test Public Endpoint (GET /items):**
This endpoint should be accessible without authentication.

```bash
curl http://localhost:5001/YOUR_PROJECT_ID/us-central1/api/items
```
**Expected Output:** A JSON array of items, initially:
```json
[{"id":1,"name":"Item 1"},{"id":2,"name":"Item 2"}]
```

**b. Test Protected Endpoint (POST /items) - Without Token:**
Attempting to access a protected endpoint without a token should result in an error.

```bash
curl -X POST -H "Content-Type: application/json" -d '{"name":"New Item from Curl"}' http://localhost:5001/YOUR_PROJECT_ID/us-central1/api/items
```
**Expected Output:** A 401 Unauthorized error.
```json
{"error":"Unauthorized - No token provided or incorrect format."}
```

**c. Test Protected Endpoint (GET /items/1) - Without Token:**
Similarly, trying to get a specific item without a token.

```bash
curl http://localhost:5001/YOUR_PROJECT_ID/us-central1/api/items/1
```
**Expected Output:** A 401 Unauthorized error.
```json
{"error":"Unauthorized - No token provided or incorrect format."}
```

**d. Obtaining a Test ID Token (Guidance):**

*   For testing authenticated endpoints, you need a valid Firebase ID token.
*   When using the Firebase Auth Emulator, you can create test users in the **Emulator UI** (usually at `http://localhost:4000`, then navigate to the "Auth" tab). Add a user with an email and password.
*   Once a user is created in the Auth emulator, you need to "sign in" as that user to get an ID token. This typically involves:
    *   **Programmatically**: Writing a small script (e.g., Node.js using `firebase/auth` client SDK, or Python using `pyrebase`) configured to use the Auth emulator's endpoint (`http://localhost:9099`). You'd sign in with the test user's credentials, and the SDK would return an ID token.
    *   **REST API**: You can also directly call the Firebase Auth REST API for identity providers (like email/password) against the emulator's endpoint. For email/password, this is `http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIza...` (the key can be any string for the emulator).
*   For the purpose of manual `curl` testing, you would copy this ID token obtained from one of the methods above.
*   **For this guide, we'll use `YOUR_TEST_ID_TOKEN` as a placeholder. Replace this with an actual token when you test.**

**e. Test Protected Endpoint (POST /items) - With Placeholder Token:**
Now, include the `Authorization` header with your placeholder token.

```bash
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TEST_ID_TOKEN" -d '{"name":"Authenticated Item"}' http://localhost:5001/YOUR_PROJECT_ID/us-central1/api/items
```
**Expected Output:** A 201 Created status and the JSON of the newly created item.
```json
{"id":3,"name":"Authenticated Item"}
```
*(The ID might vary if you've run this multiple times or if initial data changes)*

**f. Test Protected Endpoint (GET /items/1) - With Placeholder Token:**
(Assuming item with ID 1 exists from the initial data)

```bash
curl -H "Authorization: Bearer YOUR_TEST_ID_TOKEN" http://localhost:5001/YOUR_PROJECT_ID/us-central1/api/items/1
```
**Expected Output:** JSON of the item with ID 1.
```json
{"id":1,"name":"Item 1"}
```

**g. Test Non-Existent Item (GET /items/99) - With Placeholder Token:**
Test how the API handles requests for resources that don't exist.

```bash
curl -H "Authorization: Bearer YOUR_TEST_ID_TOKEN" http://localhost:5001/YOUR_PROJECT_ID/us-central1/api/items/99
```
**Expected Output:** A 404 Not Found error.
```json
{"error":"Item not found"}
```

**h. Test the `helloWorld` function:**
This is a simple, non-Express function.

```bash
curl http://localhost:5001/YOUR_PROJECT_ID/us-central1/helloWorld
```
**Expected Output:**
```
Hello from Firebase!
```

This guide should help you test your Firebase Functions locally using `curl` and the Firebase Emulator Suite. Remember to replace placeholders like `YOUR_PROJECT_ID` and `YOUR_TEST_ID_TOKEN` with actual values.
```
