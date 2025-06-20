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
