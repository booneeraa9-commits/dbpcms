import { z } from 'zod';

export const createCourseSchema = z.object({
  departmentId: z.string().uuid('Invalid department'),
  programId: z.string().uuid().optional().or(z.literal('')),
  code: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase letters, numbers, dashes'),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  level: z.coerce.number().int().min(1).max(5),
  credits: z.coerce.number().int().min(0).default(3),
  theoryHours: z.coerce.number().int().min(0).default(0),
  practicalHours: z.coerce.number().int().min(0).default(0),
  competencyIds: z.array(z.string().uuid()).default([]),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listCoursesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  level: z.coerce.number().int().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'name', 'code', 'level']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
