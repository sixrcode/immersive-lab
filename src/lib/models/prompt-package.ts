export interface PromptPackage {
  id: string;
  userId: string;
  prompt: string;
  stylePreset?: string;
  originalImageURL?: string;
  createdAt: Date;
  updatedAt: Date;
  loglines: Logline[];
  moodBoard: MoodBoard;
  shotList: Shot[];
  animaticDescription: string;
  pitchSummary: string;
  version: number;
  collaboratorIds?: string[];
}

// Referenced types are defined in src/lib/types.ts
// Ensure Logline, MoodBoard, MoodBoardCell, and Shot are imported where this interface is used.
