import { z } from 'zod';

export const createExamSchema = z.object({
  title: z.string().min(3).max(200),
  courseId: z.string().uuid(),
  semesterId: z.string().uuid(),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  totalMarks: z.coerce.number().min(1).max(1000),
  instructions: z.string().max(2000).optional().or(z.literal('')),
  difficultyDistribution: z.object({
    EASY: z.number().min(0).max(100).default(30),
    MEDIUM: z.number().min(0).max(100).default(50),
    HARD: z.number().min(0).max(100).default(20),
  }).optional(),
  scheduledAt: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

export const updateExamSchema = createExamSchema.partial();

export const addQuestionsSchema = z.object({
  questions: z.array(z.object({
    questionId: z.string().uuid(),
    marks: z.coerce.number().min(0.1).max(1000),
  })).min(1),
});

export const autoGenerateSchema = z.object({
  totalQuestions: z.coerce.number().int().min(1).max(200),
  types: z.array(z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'SHORT_ANSWER', 'ESSAY', 'PRACTICAL'])).default(['MULTIPLE_CHOICE', 'TRUE_FALSE']),
  difficultyDistribution: z.object({
    EASY: z.number().min(0).max(100).default(30),
    MEDIUM: z.number().min(0).max(100).default(50),
    HARD: z.number().min(0).max(100).default(20),
  }).optional(),
});

export const reorderSchema = z.object({
  order: z.array(z.object({
    questionId: z.string().uuid(),
    order: z.number().int().min(0),
  })),
});

export const listExamsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  courseId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  sortBy: z.enum(['createdAt', 'title', 'scheduledAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type AutoGenerateInput = z.infer<typeof autoGenerateSchema>;
export type ListExamsQuery = z.infer<typeof listExamsQuerySchema>;
