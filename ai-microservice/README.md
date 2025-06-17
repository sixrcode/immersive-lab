# AI Microservice (aiApi)

This microservice centralizes key AI-driven functionalities for the ISL.SIXR.tv platform. It is built using Node.js and Express, leveraging Genkit for orchestrating AI flows with models like Google's Gemini. This service is deployed as a single Firebase Function named `aiApi`.

## Purpose

The primary purpose of this microservice is to:
-   Provide a unified backend for various AI-powered features.
-   Manage interactions with AI models (e.g., Gemini via Google AI).
-   Process structured input from frontend features.
-   Encapsulate complex AI logic, making the frontend and other backend services simpler.

## Authentication

All API endpoints exposed by this microservice require a valid Firebase ID token. The token must be included in the `Authorization` header as a Bearer token:

`Authorization: Bearer <YOUR_FIREBASE_ID_TOKEN>`

Requests without a valid token will be rejected.

## API Endpoints

The base URL for this microservice when deployed as a Firebase Function is:
`https://<region>-<project-id>.cloudfunctions.net/aiApi`

Replace `<region>` and `<project-id>` with your specific Firebase project configuration.

### 1. Script Analysis

*   **Endpoint:** `POST /analyzeScript`
*   **Description:** Accepts script content and returns a `ScriptAnalysisPackage` containing insights on pacing, character arcs, potential plot holes, and other script elements.
*   **Request Body:**
    ```json
    {
      "script": "Your script text here..."
    }
    ```
*   **Response Body:** A JSON object representing the `ScriptAnalysisPackage`.
*   **Core Logic:** Implemented in `ai-microservice/src/flows/ai-script-analyzer.ts`.

### 2. Prompt to Prototype

*   **Endpoint:** `POST /promptToPrototype`
*   **Description:** Generates a comprehensive `PromptPackage` (including loglines, mood board concepts, shot lists, etc.) based on a user's textual prompt, an optional image, and style presets.
*   **Request Body:**
    ```json
    {
      "prompt": "A high-level concept or idea.",
      "imageDataUri": "data:image/jpeg;base64,...", // Optional
      "stylePreset": "Sci-Fi" // Optional
    }
    ```
*   **Response Body:** A JSON object representing the `PromptPackage`.
*   **Core Logic:** Implemented in `ai-microservice/src/flows/prompt-to-prototype.ts`.

### 3. Storyboard Generation

*   **Endpoint:** `POST /generateStoryboard`
*   **Description:** Takes a scene description or elements from a `PromptPackage` and generates a `StoryboardPackage`, including visual panel descriptions and potentially AI-generated placeholder images.
*   **Request Body:**
    ```json
    {
      "sceneDescription": "Detailed description of the scene for the storyboard.",
      "promptPackage": { ... } // Optional, can provide context from a prior prototype
    }
    ```
*   **Response Body:** A JSON object representing the `StoryboardPackage`.
*   **Core Logic:** Implemented in `ai-microservice/src/flows/storyboard-generator-flow.ts`.

## Source Code

The source code for this microservice is located within the `ai-microservice/` directory in the main repository. The entry point for the Firebase Function is `ai-microservice/index.js`.

## Deployment

This microservice is deployed as a Firebase Cloud Function. To deploy changes, use the Firebase CLI:

```bash
firebase deploy --only functions:aiApi
```

Ensure you are authenticated with Firebase (`firebase login`) and have selected the correct Firebase project (`firebase use <project-id>`) before deploying.

## Environment Variables

This microservice relies on Firebase project configurations set up during initialization and deployment. Specific API keys for third-party AI services (like Google AI/Vertex AI) are managed through Genkit configurations and Google Cloud IAM permissions associated with the deployment environment.

The Next.js application uses the `NEXT_PUBLIC_AI_MICROSERVICE_URL` environment variable to know where to send requests to this service. This variable should be set to the deployed function's URL (e.g., `https://us-central1-your-project-id.cloudfunctions.net/aiApi`).
```
