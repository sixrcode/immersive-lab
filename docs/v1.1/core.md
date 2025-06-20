# Phase 1: Core Generation Pipeline - Prompt-to-Prototype Studio

## Overview

The Prompt-to-Prototype Studio is a tool designed to rapidly transform a user's initial concept (a text prompt, optionally accompanied by a reference image and style preset) into a comprehensive set of creative assets. This core generation pipeline (Phase 1) focuses on establishing the foundational workflow, from user input to the generation and storage of a multi-faceted "PromptPackage."

## Features

-   **Prompt Input UI:**
    -   Text area for detailed user prompts.
    -   Optional file upload for a reference image.
    -   Optional selection from a list of style presets to guide the generation tone and aesthetics.
-   **Output Generation (PromptPackage):**
    -   **Loglines:** Multiple distinct loglines (e.g., targeting different tones).
    -   **Mood Board:**
        -   One AI-generated image representing the overall visual theme.
        -   Nine themed text cells providing detailed descriptions for different aspects of the mood board (e.g., Key Character Focus, Environment Details, Color Palette).
    -   **Shot List:** A list of 6-10 descriptive shots, including suggested lens, camera move, and framing notes.
    -   **Animatic Description:** A textual description for a short (e.g., 4-second) animatic or proxy clip, outlining key visuals and pacing.
    -   **Pitch Summary:** A concise summary of the project idea suitable for a quick pitch.
-   **JSON Download:** Users can download the complete `PromptPackage` (including image URLs and all generated text) as a JSON file.
-   **Persistent Storage:**
    -   All generated `PromptPackage` data is stored in a Firestore collection.
    -   User-uploaded reference images and AI-generated mood board images are stored in Firebase Cloud Storage.

## Data Models

### `PromptPackage`

This is the central data model for the studio. It encapsulates all user inputs and generated outputs for a single prototype idea.

Key fields include:

-   `id: string` (Unique identifier for the package)
-   `userId: string` (Identifier for the user, placeholder "anonymous_user" in Phase 1)
-   `prompt: string` (The user's original text prompt)
-   `stylePreset?: string` (Selected style preset)
-   `originalImageURL?: string` (URL to the user-uploaded image in Firebase Storage)
-   `createdAt: Date` (Timestamp of creation)
-   `updatedAt: Date` (Timestamp of last update)
-   `loglines: Logline[]` (Array of logline objects)
-   `moodBoard: MoodBoard` (Object containing the AI-generated image URL and themed text cells)
-   `shotList: Shot[]` (Array of shot objects)
-   `animaticDescription: string` (Textual description for an animatic)
-   `pitchSummary: string` (A concise pitch for the project)
-   `version: number` (Version control for the package)

Relevant types from `@isl/types` (defined in `src/lib/types.ts`):

-   **`Logline`**: `{ tone: string; text: string; }`
-   **`MoodBoardCell`**: `{ title: string; description: string; }`
-   **`MoodBoard`**: `{ generatedImageURL: string; cells: MoodBoardCell[]; }` (cells array typically has 9 items)
-   **`Shot`**: `{ shotNumber: number; lens: string; cameraMove: string; framingNotes: string; }`

### Storage Details

-   **Firestore:** `PromptPackage` objects are stored as documents in the `promptPackages` collection. The document ID is the `PromptPackage.id`.
-   **Firebase Cloud Storage:**
    -   User-uploaded reference images: `prototypes/{userId}/{promptPackageId}/user-upload-{uuid}.{ext}`
    -   AI-generated mood board images: `prototypes/{userId}/{promptPackageId}/moodboard-{uuid}.{ext}`
    (Note: `userId` is "anonymous_user" in Phase 1)

## API Endpoint: `/api/prototype/generate` (Next.js BFF Route)

This Next.js API route serves as a Backend-For-Frontend (BFF). It is responsible for:
1. Validating the client's input.
2. Authenticating the user and forwarding the request along with the user's ID token to the `ai-microservice`.
3. Receiving the generated `PromptPackage` from the `ai-microservice`.
4. Returning this `PromptPackage` to the client.

It **delegates** the core processing (AI generation, image handling, Firestore saving) to the `ai-microservice`.

-   **URL:** `/api/prototype/generate` (within the Next.js application)
-   **Method:** `POST`
-   **Request Body (JSON):**
    Corresponds to the `PromptToPrototypeInput` schema. This is the data sent from the client to this Next.js API route.

    ```json
    {
      "prompt": "A serene cyberpunk alleyway after a rain shower, neon signs reflecting in puddles.",
      "imageDataUri": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE...",
      "stylePreset": "lo-fi"
    }
    ```
    *   `prompt: string` (Required)
    *   `imageDataUri?: string` (Optional. Base64 encoded data URI for an uploaded image)
    *   `stylePreset?: string` (Optional. A string identifying a style preset)

-   **Interaction with `ai-microservice`:**
    - This Next.js route makes a `POST` request to the `/promptToPrototype` endpoint of the `ai-microservice` (URL configured via `NEXT_PUBLIC_AI_MICROSERVICE_URL`).
    - The `ai-microservice` is responsible for the actual AI flow execution, handling any image uploads (user-provided or AI-generated mood boards) to Firebase Storage, and saving the final `PromptPackage` to the `promptPackages` Firestore collection.

-   **Response (Success - 200 OK from this Next.js route):**
    Returns the complete `PromptPackage` object as JSON, which it received from the `ai-microservice`. The `ai-microservice` would have returned a 200 or 201 status to the Next.js route upon successful creation and storage of the `PromptPackage`.

    ```json
    {
      "id": "b1b2c3d4-e5f6-7890-1234-567890abcdef",
      "userId": "anonymous_user",
      "prompt": "A serene cyberpunk alleyway...",
      "stylePreset": "lo-fi",
      "originalImageURL": "https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/prototypes%2Fanonymous_user%2Fb1b2c3d4%2Fuser-upload-uuid.jpg?alt=media&token=...",
      "createdAt": "2023-10-27T10:00:00.000Z",
      "updatedAt": "2023-10-27T10:00:05.000Z",
      "loglines": [
        { "tone": "Poetic", "text": "Neon tears on concrete skin, the city weeps electric." }
      ],
      "moodBoard": {
        "generatedImageURL": "https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/prototypes%2Fanonymous_user%2Fb1b2c3d4%2Fmoodboard-uuid.png?alt=media&token=...",
        "cells": [
          { "title": "Key Character Focus", "description": "A lone figure with a holographic umbrella." },
          { "title": "Environment Details", "description": "Steam rising from vents, glowing kanji signs." },
          // ... other 7 cells
        ]
      },
      "shotList": [
        { "shotNumber": 1, "lens": "35mm", "cameraMove": "Low Angle Dolly In", "framingNotes": "Street level, pushing towards a reflective puddle." }
      ],
      "animaticDescription": "A slow pan across the alley, focusing on reflections, then a character walks by.",
      "pitchSummary": "A visually rich, atmospheric piece exploring solitude in a high-tech, rain-slicked world.",
      "version": 1
    }
    ```

-   **Response (Error - 400 Bad Request):**
    Indicates invalid input, usually due to missing required fields or malformed data. The `details` field often contains an array of issues from Zod validation.

    ```json
    {
      "error": "Invalid input",
      "details": [
        {
          "code": "invalid_type",
          "expected": "string",
          "received": "undefined",
          "path": ["prompt"],
          "message": "Required"
        }
      ]
    }
    ```

-   **Response (Error - 500 Internal Server Error):**
    Indicates a server-side issue during processing, such as an error from the AI flow, database operation failure, or image storage problem.

    ```json
    {
      "error": "AI flow processing error",
      "details": "Specific error message from the AI flow or underlying service."
    }
    ```
    Or:
    ```json
    {
      "error": "Failed to save data to database.",
      "details": "Specific error message from Firestore."
    }
    ```

## UI Components

-   **`PromptInput` (`src/components/prompt-input.tsx`):**
    -   **Purpose:** Provides the user interface for submitting the initial prompt, uploading an optional reference image, and selecting an optional style preset.
    -   **Key Inputs:** Textarea for prompt, file input for image, select dropdown for style.
-   **`PrototypeDisplay` (`src/components/prototype-display.tsx`):**
    -   **Purpose:** Renders the generated `PromptPackage` in a structured and readable format.
    -   **Displays:** All elements of the `PromptPackage`, including the original input, loglines, mood board (image and 9 cells), shot list, animatic description, and pitch summary.
-   **Main Page (`src/app/prompt-to-prototype/page.tsx`):**
    -   **Orchestration:** This page hosts the `PromptInput` component to capture user data and the `PrototypeDisplay` component to show the results.
    -   It handles the API call to `/api/prototype/generate`, manages loading and error states, and uses toast notifications for user feedback.

## Regeneration Toggles

The `PrototypeDisplay` component includes visual "Regenerate" buttons next to various sections (e.g., Loglines, Mood Board Image, individual Mood Board Cells, Shot List items).

**In Phase 1, these buttons are placeholders and are not functional.** The implementation of the regeneration logic is planned for Phase 4.

## Download Button

A "Download JSON" button is available in the `PrototypeDisplay` component. This allows the user to download the entire `PromptPackage` (including image URLs and all generated text) as a JSON file (e.g., `prompt-package-{first_8_chars_of_id}.json`). This is useful for offline use, sharing, or integration with other tools.
