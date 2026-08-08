import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema } from '@dbpcms/shared';

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: phoneSchema,
  roleIds: z.array(z.string().uuid()).min(1, 'At least one role is required'),
});

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: phoneSchema,
  avatarUrl: z.string().url().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  roleIds: z.array(z.string().uuid()).min(1).optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED']).optional(),
  roleSlug: z.string().optional(),
  sortBy: z.enum(['createdAt', 'email', 'firstName', 'lastName', 'lastLoginAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
