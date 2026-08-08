import { ROLES, type RoleName } from "./roles.js";
import { PERMISSIONS, type Permission } from "./permissions.js";

/**
 * The definitive mapping of which permissions each role has. The seed script
 * uses this to build the database. Because code checks PERMISSIONS (not role
 * names), you can later re-balance this mapping without touching feature code.
 *
 * This is the single source of truth for "who can do what" in Version 1.
 */
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [ROLES.SYSTEM_ADMINISTRATOR]: [
    // Administrators get every permission in the system.
    ...Object.values(PERMISSIONS),
  ],

  [ROLES.HR_OFFICER]: [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_UPDATE,
    PERMISSIONS.EMPLOYEE_PRINT,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DEPARTMENT_READ,
    PERMISSIONS.REPORT_VIEW,
  ],

  [ROLES.DEAN]: [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.DEPARTMENT_READ,
    PERMISSIONS.PROGRAM_READ,
    PERMISSIONS.STUDENT_READ,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
  ],

  [ROLES.REGISTRAR]: [
    PERMISSIONS.STUDENT_READ,
    PERMISSIONS.STUDENT_MANAGE,
    PERMISSIONS.SEMESTER_MANAGE,
    PERMISSIONS.COURSE_MANAGE,
    PERMISSIONS.SECTION_MANAGE,
    PERMISSIONS.GRADE_PUBLISH,
    PERMISSIONS.GRADE_UNLOCK,
    PERMISSIONS.DEPARTMENT_READ,
    PERMISSIONS.PROGRAM_READ,
    PERMISSIONS.REPORT_VIEW,
  ],

  [ROLES.DEPARTMENT_HEAD]: [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.STUDENT_READ,
    PERMISSIONS.COURSE_MANAGE,
    PERMISSIONS.SECTION_MANAGE,
    PERMISSIONS.GRADE_APPROVE,
    PERMISSIONS.GRADING_CONFIG,
    PERMISSIONS.DEPARTMENT_READ,
    PERMISSIONS.PROGRAM_READ,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORT_VIEW,
  ],

  [ROLES.INSTRUCTOR]: [
    PERMISSIONS.STUDENT_READ,
    PERMISSIONS.GRADE_ENTER,
    PERMISSIONS.GRADE_SUBMIT,
    PERMISSIONS.COURSE_MANAGE,
  ],

  [ROLES.EMPLOYEE]: [
    PERMISSIONS.OWN_PROFILE_READ,
    PERMISSIONS.OWN_PROFILE_UPDATE,
    PERMISSIONS.DOCUMENT_READ,
  ],

  [ROLES.STUDENT]: [
    PERMISSIONS.OWN_PROFILE_READ,
  ],
};

/** Human-friendly descriptions for the seeded roles. */
export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  [ROLES.SYSTEM_ADMINISTRATOR]: "Full control over the entire system.",
  [ROLES.HR_OFFICER]: "Manages employee records and HR reports.",
  [ROLES.DEAN]: "Institutional oversight and analytics.",
  [ROLES.REGISTRAR]: "Manages academic records, students, and grade publishing.",
  [ROLES.DEPARTMENT_HEAD]: "Manages a department's instructors and grade approvals.",
  [ROLES.INSTRUCTOR]: "Enters and submits grades for assigned courses.",
  [ROLES.EMPLOYEE]: "Views own profile and documents.",
  [ROLES.STUDENT]: "Views own academic information (future module).",
};
