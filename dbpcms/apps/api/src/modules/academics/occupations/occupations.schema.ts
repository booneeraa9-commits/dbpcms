import { z } from 'zod';

export const createOccupationSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase letters, numbers, dashes'),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
});

export const updateOccupationSchema = createOccupationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listOccupationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateOccupationInput = z.infer<typeof createOccupationSchema>;
export type UpdateOccupationInput = z.infer<typeof updateOccupationSchema>;
export type ListOccupationsQuery = z.infer<typeof listOccupationsQuerySchema>;
