import { z } from "zod";

/** Validation for the employee "multiple entries" sections (Phase 4.2). */

const yearNow = new Date().getFullYear();
const optionalString = z.string().trim().max(300).optional().or(z.literal(""));

// ---- Education ------------------------------------------------------------
export const educationSchema = z.object({
  institution: z.string().trim().min(2, "Institution is required.").max(200),
  qualification: z.string().trim().min(2, "Qualification is required.").max(150),
  fieldOfStudy: optionalString,
  graduationYear: z
    .union([z.coerce.number().int().min(1950).max(yearNow + 10), z.literal("")])
    .optional(),
  gpa: z.string().trim().max(20).optional().or(z.literal("")),
});
export type EducationInput = z.infer<typeof educationSchema>;

// ---- Qualification --------------------------------------------------------
export const QUALIFICATION_TYPES = [
  "certification",
  "license",
  "workshop",
  "training",
  "membership",
] as const;

export const qualificationSchema = z.object({
  type: z.enum(QUALIFICATION_TYPES, {
    errorMap: () => ({ message: "Select a type." }),
  }),
  title: z.string().trim().min(2, "Title is required.").max(200),
  issuer: optionalString,
  issueDate: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  referenceNo: z.string().trim().max(100).optional().or(z.literal("")),
});
export type QualificationInput = z.infer<typeof qualificationSchema>;

export const QUALIFICATION_TYPE_LABELS: Record<string, string> = {
  certification: "Certification",
  license: "License",
  workshop: "Workshop",
  training: "Training",
  membership: "Professional Membership",
};

// ---- Employment history ---------------------------------------------------
export const employmentHistorySchema = z.object({
  employer: z.string().trim().min(2, "Employer is required.").max(200),
  position: z.string().trim().min(2, "Position is required.").max(150),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  responsibilities: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type EmploymentHistoryInput = z.infer<typeof employmentHistorySchema>;

// ---- Emergency contact ----------------------------------------------------
export const emergencyContactSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(150),
  relationship: z.string().trim().max(80).optional().or(z.literal("")),
  phoneNumber: z.string().trim().min(7, "A valid phone number is required.").max(30),
  address: optionalString,
});
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
