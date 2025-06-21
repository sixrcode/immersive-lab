export interface Tutorial {
  id: string;
  title: string;
  url: string;
  category: 'VR' | 'XR' | 'AI Filmmaking' | 'Open Source Creative Tools' | 'Other';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  publishDate: string; // ISO 8601 date string
  popularity: number; // e.g., view count, upvotes, or a combined score
  description?: string;
  tags?: string[];
  thumbnailUrl?: string;
  author?: string;
}
