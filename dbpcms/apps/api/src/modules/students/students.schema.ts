/**
 * Zod validators for student endpoints.
 */

import { z } from 'zod';

const ethiopianPhoneSchema = z
  .string()
  .regex(/^(\+251|0)?9\d{8}$/, 'Invalid Ethiopian phone number')
  .optional()
  .or(z.literal(''));

export const createStudentSchema = z.object({
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional().or(z.literal('')),
  lastName: z.string().min(1).max(100),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  birthDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date'),
  nationalId: z.string().max(50).optional().or(z.literal('')),
  phone: ethiopianPhoneSchema,
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),

  // Family
  guardianName: z.string().max(200).optional().or(z.literal('')),
  guardianPhone: ethiopianPhoneSchema,
  emergencyContactName: z.string().max(200).optional().or(z.literal('')),
  emergencyContactPhone: ethiopianPhoneSchema,

  // Previous education
  previousSchool: z.string().max(200).optional().or(z.literal('')),
  previousGrade: z.string().max(50).optional().or(z.literal('')),

  // Academic placement
  programId: z.string().uuid('Select a program'),
  admissionDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid date'),
  initialLevel: z.coerce.number().int().min(1).max(5).default(1),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  status: z.enum(['ACTIVE', 'GRADUATED', 'SUSPENDED', 'WITHDRAWN', 'TRANSFERRED']).optional(),
});

export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'GRADUATED', 'SUSPENDED', 'WITHDRAWN', 'TRANSFERRED']).optional(),
  programId: z.string().uuid().optional(),
  level: z.coerce.number().int().min(1).max(5).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  academicYearId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'lastName', 'firstName', 'studentIdNumber']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Yearly registration
export const createRegistrationSchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  level: z.coerce.number().int().min(1).max(5),
  section: z.string().max(20).optional().or(z.literal('')),
  rollNumber: z.string().max(20).optional().or(z.literal('')),
});

export const bulkImportSchema = z.object({
  students: z.array(createStudentSchema).min(1).max(500),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;
export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
