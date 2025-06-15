
export interface KanbanCardType {
  id: string;
  title: string;
  description?: string;
  stage: string; 
  // Optional: Add tags, assignee, priority, etc.
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string; 
  coverImage?: string;
  dataAiHint?: string;
}

// New interfaces for PromptPackage
export interface Logline {
  tone: string;
  text: string;
}

export interface MoodBoardCell {
  title: string; // e.g., "Key Character Focus"
  description: string;
}

export interface MoodBoard {
  generatedImageURL: string; // URL to the AI-generated mood board image in Firebase Storage
  cells: MoodBoardCell[]; // 9 cells
}

export interface Shot {
  shotNumber: number;
  lens: string; // e.g., "35mm"
  cameraMove: string; // e.g., "Slow Push-in"
  framingNotes: string; // e.g., "Close up on character's eyes"
}

// Import and re-export PromptPackage
export type { PromptPackage } from './models/prompt-package';

export interface KanbanColumnType {
  id: string;
  title: string;
  cards: KanbanCardType[];
}

export interface KanbanBoardType {
  columns: KanbanColumnType[];
}

export interface PortfolioItemType {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string; 
  tags?: string[];
  category: string; // e.g., Short Film, Animation, Microdrama
  duration?: string; // e.g., "5 min", "12 episodes"
  datePublished?: string;
  dataAiHint?: string;
}
