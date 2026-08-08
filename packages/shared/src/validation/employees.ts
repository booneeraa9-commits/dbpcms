import { z } from "zod";

/**
 * Shared validation for employees. Required fields follow the "strict" choice:
 * name, gender, DOB, National ID, phone, email, department, position,
 * employment status, and date of employment are required.
 */

export const GENDERS = ["male", "female"] as const;
export const MARITAL_STATUSES = ["single", "married", "divorced", "widowed"] as const;
export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract"] as const;
export const EMPLOYMENT_STATUSES = [
  "active",
  "on_leave",
  "suspended",
  "terminated",
  "retired",
] as const;

const optionalString = z.string().trim().max(200).optional().or(z.literal(""));

export const employeeCreateSchema = z.object({
  // Personal
  firstName: z.string().trim().min(2, "First name is required.").max(80),
  middleName: optionalString,
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: "Select a gender." }) }),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  nationality: optionalString,
  maritalStatus: z.enum(MARITAL_STATUSES).optional().or(z.literal("")),
  nationalId: z.string().trim().min(3, "National ID is required.").max(50),
  taxId: optionalString,
  phoneNumber: z.string().trim().min(7, "A valid phone number is required.").max(30),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  address: z.string().trim().max(300).optional().or(z.literal("")),

  // Employment
  departmentId: z.string().uuid("Select a department."),
  position: z.string().trim().min(2, "Position is required.").max(120),
  employmentType: z.enum(EMPLOYMENT_TYPES, {
    errorMap: () => ({ message: "Select an employment type." }),
  }),
  contractType: optionalString,
  employmentStatus: z.enum(EMPLOYMENT_STATUSES, {
    errorMap: () => ({ message: "Select an employment status." }),
  }),
  dateOfEmployment: z.string().min(1, "Date of employment is required."),
  contractEndDate: z.string().optional().or(z.literal("")),
  salaryGrade: optionalString,
  officeLocation: optionalString,
  supervisorId: z.string().uuid().optional().or(z.literal("")),
});
export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

export const employeeUpdateSchema = employeeCreateSchema.partial();
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;

/** Human-friendly labels for the enums (used by the frontend). */
export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
};
export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_leave: "On leave",
  suspended: "Suspended",
  terminated: "Terminated",
  retired: "Retired",
};
