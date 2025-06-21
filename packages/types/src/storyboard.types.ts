// packages/types/src/storyboard.types.ts

/**
 * Represents a single panel in a storyboard.
 */
export interface Panel {
  id: string; // Unique identifier for the panel
  imageURL: string; // URL to the full-resolution panel image (e.g., in Firebase Storage)
  previewURL: string; // URL to a lower-resolution preview image (e.g., webp)
  alt: string; // Alt text for accessibility
  caption: string; // User-editable caption or scene action
  camera?: string; // Optional camera shot type (e.g., "Close Up", "Wide Shot")
  durationMs?: number; // Optional suggested duration in milliseconds
  generatedAt: string; // ISO timestamp of when the panel was generated
  panelNumber?: number; // Optional panel number
  dialogueOrSound?: string; // Optional dialogue or sound description
  // Add any other panel-specific metadata here
}

/**
 * Defines the structure for a storyboard package.
 * This is the main data object that will be persisted to Firestore
 * and used throughout the Storyboarding Studio.
 */
export interface StoryboardPackage {
  id: string; // Unique identifier for the storyboard
  title?: string; // Optional title for the storyboard
  sceneDescription: string; // The original user prompt or scene description
  panelCount: number; // The number of panels requested by the user
  stylePreset?: string; // The style preset selected by the user (e.g., "cinematic", "anime")
  referenceImageURL?: string; // Optional URL to a user-uploaded reference image
  panels: Panel[]; // An ordered array of storyboard panels
  createdAt: string; // ISO timestamp of when the storyboard package was created
  updatedAt: string; // ISO timestamp of when the storyboard package was last updated
  userId?: string; // Identifier for the user who created the storyboard
  projectId: string; // ID of the project this storyboard belongs to
  // Add any other storyboard-level metadata here
}

/**
 * Props for the API endpoint that generates a storyboard.
 */
export interface GenerateStoryboardProps {
  sceneDescription: string;
  panelCount: number; // Min 2, Max 10 (as per requirements)
  stylePreset?: string;
  referenceImage?: File | string; // File object for upload, or URL string
}

/**
 * Represents the streamed response from the generation endpoint.
 * Could be progress updates or the final StoryboardPackage.
 */
export type StoryboardStreamResponse =
  | { status: 'processing'; progress: number; message?: string }
  | { status: 'success'; package: StoryboardPackage }
  | { status: 'error'; message: string };
