/**
 * Zod validators for results endpoints.
 */

import { z } from 'zod';

export const createResultSchema = z.object({
  studentId: z.string().uuid(),
  semesterId: z.string().uuid(),
  courseId: z.string().uuid(),
  assessmentType: z.enum(['EXAM', 'ASSIGNMENT', 'PRACTICAL', 'PROJECT']),
  marksObtained: z.coerce.number().min(0),
  marksTotal: z.coerce.number().min(0.1),
  competencyLevel: z.enum(['COMPETENT', 'NOT_YET_COMPETENT']).optional(),
  remarks: z.string().max(500).optional().or(z.literal('')),
});

export const bulkCreateResultsSchema = z.object({
  results: z.array(createResultSchema).min(1).max(500),
});

export const updateResultSchema = createResultSchema.partial();

export const workflowActionSchema = z.object({
  action: z.enum(['verify', 'approve', 'authorize', 'publish', 'reject']),
  reason: z.string().max(500).optional(),
});

export const listResultsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  studentId: z.string().uuid().optional(),
  semesterId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PENDING_VERIFICATION', 'PENDING_APPROVAL', 'PENDING_AUTHORIZATION', 'PUBLISHED']).optional(),
  sortBy: z.enum(['createdAt', 'marksObtained']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateResultInput = z.infer<typeof createResultSchema>;
export type UpdateResultInput = z.infer<typeof updateResultSchema>;
export type ListResultsQuery = z.infer<typeof listResultsQuerySchema>;
export type WorkflowActionInput = z.infer<typeof workflowActionSchema>;
