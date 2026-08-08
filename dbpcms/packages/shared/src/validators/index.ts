/**
 * Zod validators shared between frontend and backend.
 * Frontend uses these for form validation.
 * Backend uses these to validate incoming requests.
 * ONE schema, two consumers — guaranteed consistency.
 */

import { z } from 'zod';
import { SYSTEM } from '../constants';

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(SYSTEM.PASSWORD_MIN_LENGTH, `Password must be at least ${SYSTEM.PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .regex(/^(\+251|0)?9\d{8}$/, 'Please enter a valid Ethiopian phone number')
  .optional()
  .or(z.literal(''));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
