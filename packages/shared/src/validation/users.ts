import { z } from "zod";

/**
 * Shared validation for user & role management (admin).
 * Used by the frontend forms and re-checked on the backend.
 */

export const userCreateSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  // Temporary password the admin sets; the user is forced to change it on first login.
  temporaryPassword: z
    .string()
    .min(12, "Temporary password must be at least 12 characters.")
    .max(128),
  roleIds: z.array(z.string().uuid()).min(1, "Assign at least one role."),
  isActive: z.boolean().default(true),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string().uuid()).min(1, "Assign at least one role.").optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const adminResetPasswordSchema = z.object({
  temporaryPassword: z
    .string()
    .min(12, "Temporary password must be at least 12 characters.")
    .max(128),
});
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
