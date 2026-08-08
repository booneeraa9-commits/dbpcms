/**
 * Zod validators for departments endpoints.
 */

import { z } from 'zod';

export const createDepartmentSchema = z.object({
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase letters, numbers, and dashes only'),
  name: z.string().min(2, 'Name is required').max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  headId: z.string().uuid().optional().or(z.literal('')),
});

export const updateDepartmentSchema = createDepartmentSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listDepartmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'name', 'code']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type ListDepartmentsQuery = z.infer<typeof listDepartmentsQuerySchema>;
