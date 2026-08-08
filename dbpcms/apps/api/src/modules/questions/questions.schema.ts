/**
 * Zod validators for question endpoints.
 *
 * The `content` shape varies by question type. We validate the outer shape
 * (type, marks, etc.) here, and the inner content is validated as JSON.
 */

import { z } from 'zod';

// Question content shape — flexible per type
// The DB stores this as JSON, so we accept any object and validate per type at the service layer.
const contentSchema = z.record(z.string(), z.any());

// Keywords: array of strings, each 1-50 chars
const keywordsSchema = z.array(z.string().min(1).max(50)).max(20).default([]);

export const createQuestionSchema = z.object({
  courseId: z.string().uuid('Course is required'),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'SHORT_ANSWER', 'ESSAY', 'PRACTICAL']),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']),
  bloomsLevel: z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']),
  marks: z.coerce.number().min(0.01).max(1000),
  content: contentSchema,
  keywords: keywordsSchema,
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string(),
    size: z.number(),
  })).optional(),
});

export const updateQuestionSchema = createQuestionSchema.partial();

export const listQuestionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  courseId: z.string().uuid().optional(),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'SHORT_ANSWER', 'ESSAY', 'PRACTICAL']).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).optional(),
  bloomsLevel: z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']).optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'ACTIVE', 'RETIRED', 'REJECTED']).optional(),
  createdById: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'marks', 'difficulty', 'timesUsed']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const reviewActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes']),
  reason: z.string().max(1000).optional(),
});

export const submitForReviewSchema = z.object({});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>;
export type ReviewActionInput = z.infer<typeof reviewActionSchema>;
