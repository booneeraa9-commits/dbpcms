import { z } from "zod";

/**
 * Validation rules for authentication, shared by frontend forms and backend.
 * Defined ONCE here so the two sides always enforce identical rules.
 */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Password policy for setting/changing a password (decision: min length 12). */
export const passwordPolicy = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .max(128, "Password must be at most 128 characters.")
  .regex(/[a-z]/, "Include at least one lowercase letter.")
  .regex(/[A-Z]/, "Include at least one uppercase letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordPolicy,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
