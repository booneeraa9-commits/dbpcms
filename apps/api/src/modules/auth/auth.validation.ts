import { z } from "zod";

/**
 * Backend validation for auth endpoints. We NEVER trust the frontend, so every
 * input is re-validated here even though the frontend validates too.
 * (loginSchema and changePasswordSchema live in @dbpcms/shared and are reused.)
 */

// The body when an admin resets another user's password.
export const resetPasswordSchema = z.object({
  temporaryPassword: z
    .string()
    .min(12, "Temporary password must be at least 12 characters.")
    .max(128),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
