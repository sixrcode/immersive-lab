
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
