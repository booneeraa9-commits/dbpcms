import { z } from "zod";
import { GENDERS } from "./employees.js";

/** Shared validation for students, courses, sections, and enrollment (Phase 5). */

const optional = z.string().trim().max(200).optional().or(z.literal(""));

export const STUDENT_STATUSES = [
  "active",
  "graduated",
  "withdrawn",
  "suspended",
] as const;
export const STUDENT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  graduated: "Graduated",
  withdrawn: "Withdrawn",
  suspended: "Suspended",
};

export const studentCreateSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required.").max(80),
  middleName: optional,
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: "Select a gender." }) }),
  dateOfBirth: z.string().optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").optional().or(z.literal("")),
  phoneNumber: optional,
  departmentId: z.string().uuid("Select a department."),
  programId: z.string().uuid("Select a program."),
  batch: optional,
  section: optional,
  status: z.enum(STUDENT_STATUSES).default("active"),
});
export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export const studentUpdateSchema = studentCreateSchema.partial();
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;

// ---- Courses --------------------------------------------------------------
export const courseCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Code may contain only letters, numbers, and hyphens.")
    .transform((v) => v.toUpperCase()),
  title: z.string().trim().min(2, "Title is required.").max(200),
  creditHours: z.coerce.number().int().min(0).max(20),
  category: optional,
  programId: z.string().uuid().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});
export type CourseCreateInput = z.infer<typeof courseCreateSchema>;
export const courseUpdateSchema = courseCreateSchema.partial();
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>;

// ---- Sections -------------------------------------------------------------
export const sectionCreateSchema = z.object({
  courseId: z.string().uuid("Select a course."),
  semesterId: z.string().uuid("Select a semester."),
  sectionLabel: z.string().trim().min(1, "Section label is required.").max(10),
  capacity: z.coerce.number().int().min(0).max(1000).optional(),
});
export type SectionCreateInput = z.infer<typeof sectionCreateSchema>;

export const assignInstructorSchema = z.object({
  instructorId: z.string().uuid("Select an instructor."),
});

// ---- Enrollment -----------------------------------------------------------
export const enrollSchema = z.object({
  studentId: z.string().uuid("Select a student."),
});
export const ENROLLMENT_STATUSES = [
  "enrolled",
  "completed",
  "withdrawn",
  "incomplete",
  "audit",
] as const;
export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  enrolled: "Enrolled",
  completed: "Completed",
  withdrawn: "Withdrawn",
  incomplete: "Incomplete",
  audit: "Audit",
};
