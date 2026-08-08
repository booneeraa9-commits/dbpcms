import { z } from "zod";

/**
 * Shared validation for the academic structure (departments, programs, academic
 * years, semesters). Used by the frontend forms AND re-checked on the backend.
 */

// ---- Departments ----------------------------------------------------------
export const departmentCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters.")
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Code may contain only letters, numbers, and hyphens.")
    .transform((v) => v.toUpperCase()),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  headUserId: z.string().uuid().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});
export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;

export const departmentUpdateSchema = departmentCreateSchema.partial();
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;

// ---- Programs -------------------------------------------------------------
export const programCreateSchema = z.object({
  departmentId: z.string().uuid("Select a department."),
  name: z.string().trim().min(2).max(150),
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Code may contain only letters, numbers, and hyphens.")
    .transform((v) => v.toUpperCase()),
  degreeLevel: z.string().trim().min(2).max(50),
  durationYears: z.coerce.number().int().min(1).max(10),
  isActive: z.boolean().default(true),
});
export type ProgramCreateInput = z.infer<typeof programCreateSchema>;
export const programUpdateSchema = programCreateSchema.partial();
export type ProgramUpdateInput = z.infer<typeof programUpdateSchema>;

// ---- Academic years -------------------------------------------------------
export const academicYearCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .regex(/^\d{4}\/\d{4}$/, "Use the format YYYY/YYYY, e.g. 2026/2027."),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after the start date.",
    path: ["endDate"],
  });
export type AcademicYearCreateInput = z.infer<typeof academicYearCreateSchema>;

// ---- Semesters ------------------------------------------------------------
export const semesterCreateSchema = z
  .object({
    academicYearId: z.string().uuid("Select an academic year."),
    name: z.string().trim().min(2).max(60),
    sequence: z.coerce.number().int().min(1).max(6),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    status: z.enum(["planned", "active", "closed"]).default("planned"),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after the start date.",
    path: ["endDate"],
  });
export type SemesterCreateInput = z.infer<typeof semesterCreateSchema>;
