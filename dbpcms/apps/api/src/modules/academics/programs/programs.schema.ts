import { z } from 'zod';

export const createProgramSchema = z.object({
  departmentId: z.string().uuid('Invalid department'),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase letters, numbers, dashes'),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  durationYears: z.coerce.number().int().min(1).max(6).default(3),
  totalCredits: z.coerce.number().int().min(0).default(0),
  levels: z.array(z.coerce.number().int().min(1).max(5)).min(1, 'At least one level required'),
  occupationIds: z.array(z.string().uuid()).default([]),
  isActive: z.boolean().default(true),
});

export const updateProgramSchema = createProgramSchema.partial();

export const listProgramsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  level: z.coerce.number().int().optional(),
  sortBy: z.enum(['createdAt', 'name', 'code']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type ListProgramsQuery = z.infer<typeof listProgramsQuerySchema>;
