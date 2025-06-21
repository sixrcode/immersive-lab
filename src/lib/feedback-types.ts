import { z } from 'zod';

export const FeedbackReportSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string(),
  prototypeId: z.string(),
  reportedContentPath: z.string(),
  reason: z.string().min(10).max(500),
  category: z.string().optional(),
  timestamp: z.preprocess((val) => (typeof val === 'string' || val instanceof Date ? new Date(val) : undefined), z.date()),
  status: z.enum(['new', 'under_review', 'resolved', 'archived']).default('new').optional(),
});

export type FeedbackReport = z.infer<typeof FeedbackReportSchema>;

export const CommentSchema = z.object({
  id: z.string().uuid().optional(),
  projectId: z.string(),
  userId: z.string(),
  text: z.string().min(1).max(1000),
  timestamp: z.preprocess((val) => (typeof val === 'string' || val instanceof Date ? new Date(val) : undefined), z.date()),
});

export type Comment = z.infer<typeof CommentSchema>;

export const RatingSchema = z.object({
  id: z.string().uuid().optional(),
  projectId: z.string(),
  userId: z.string(),
  value: z.number().min(1).max(5),
  timestamp: z.preprocess((val) => (typeof val === 'string' || val instanceof Date ? new Date(val) : undefined), z.date()),
});

export type Rating = z.infer<typeof RatingSchema>;
