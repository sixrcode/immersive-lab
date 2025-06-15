# Storyboard Core (Phase 1) - v1.1 Documentation

This document outlines the core functionality implemented in Phase 1 of the AI Storyboarding Studio.

## Overview

Phase 1 focuses on establishing the Minimum Viable Product (MVP) for storyboard creation. This includes the user interface for scene input, the backend pipeline for generating panel images (mocked initially), data persistence (mocked), and basic viewing and download capabilities.

## Key Features

*   **Scene Input UI**:
    *   Located in `packages/storyboard-studio/src/components/scene-input/SceneInputForm.tsx`.
    *   Allows users to provide:
        *   A textual scene description.
        *   The desired number of panels (between 2 and 10).
        *   An optional style preset (e.g., "cinematic", "anime").
        *   (Placeholder for optional reference image upload).
*   **Image Generation Pipeline (Mocked)**:
    *   Service logic in `packages/storyboard-studio/src/services/generation/genkitService.ts`.
    *   The `generateStoryboardWithGenkit` function simulates calls to a Genkit image generation flow.
    *   It produces an ordered array of panel data, including mock image URLs and preview URLs.
    *   Supports progress updates via a callback mechanism.
*   **API Endpoint**:
    *   `POST /api/storyboard/generate.ts` (implemented in `packages/storyboard-studio/src/pages/api/storyboard/generate.ts`).
    *   Accepts `sceneDescription`, `panelCount`, and `stylePreset`.
    *   Validates inputs and invokes the `genkitService`.
    *   Designed to support streamed responses in the future (currently sends a complete package upon mock generation completion).
*   **Data Schema (`StoryboardPackage`)**:
    *   Defined in `packages/types/src/storyboard.types.ts`.
    *   The main data structure is `StoryboardPackage`, which includes:
        *   `id`: Unique storyboard identifier.
        *   `sceneDescription`, `panelCount`, `stylePreset`.
        *   `panels`: An array of `Panel` objects.
        *   Timestamps (`createdAt`, `updatedAt`).
    *   Each `Panel` object includes:
        *   `id`: Unique panel identifier.
        *   `imageURL`, `previewURL` (pointing to mock Firebase Storage locations).
        *   `alt`: Auto-generated alt text (can be made editable later).
        *   `caption`: Placeholder for user-editable caption/action.
        *   `camera`: Placeholder for camera shot type.
        *   `durationMs`: Placeholder for suggested duration.
        *   `generatedAt`: Timestamp for panel generation.
*   **Asset Persistence (Mocked)**:
    *   Service logic in `packages/storyboard-studio/src/services/persistence/firebaseService.ts`.
    *   Simulates:
        *   Uploading panel images (PNGs) and previews (WebP) to Firebase Storage.
        *   Saving `StoryboardPackage` metadata to Firestore.
    *   The `genkitService` uses these mock functions to update panel URLs and save the final package.
*   **Storyboard Viewer (Placeholders)**:
    *   Basic React components for viewing are located in `packages/storyboard-studio/src/components/viewer/`:
        *   `StoryboardGridView.tsx`: Displays panels in a grid.
        *   `StoryboardGridPanel.tsx`: Renders a single panel in the grid.
        *   `StoryboardFullscreenView.tsx`: (Placeholder) For a larger view of a selected panel.
    *   Includes basic regeneration toggles (functionality to be fully implemented).
*   **Download Functionality**:
    *   Utility in `packages/storyboard-studio/src/utils/download.ts`.
    *   Component `packages/storyboard-studio/src/components/common/DownloadStoryboardButton.tsx`.
    *   Allows users to download the `StoryboardPackage` metadata as a JSON file.
    *   Placeholder for downloading a full ZIP archive (including images).

## Project Structure for Core Components

*   **Types**: `packages/types/src/`
*   **React Components**: `packages/storyboard-studio/src/components/`
    *   `scene-input/`
    *   `viewer/`
    *   `common/`
*   **API Routes**: `packages/storyboard-studio/src/pages/api/storyboard/`
*   **Services**: `packages/storyboard-studio/src/services/`
    *   `generation/` (Genkit mocks)
    *   `persistence/` (Firebase mocks)
*   **Utilities**: `packages/storyboard-studio/src/utils/`
*   **Tests**: Alongside the respective files (e.g., `SceneInputForm.test.tsx`).

## Next Steps (Post-Phase 1 Core)

*   Integrate actual Firebase SDK for persistence.
*   Integrate actual Genkit SDK for image generation.
*   Flesh out the UI for the storyboard viewer (grid and fullscreen).
*   Implement panel regeneration functionality.
*   Develop the "Creative-Block Support" features from Phase 2.
