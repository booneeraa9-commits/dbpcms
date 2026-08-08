/**
 * Fine-grained permissions, named "resource:action".
 * Code checks PERMISSIONS (not role names), so re-organising roles later is a
 * data change, not a code change. This is the professional RBAC pattern.
 *
 * This list will grow as modules are added. It stays the single source of truth.
 */
export const PERMISSIONS = {
  // Users & access
  USER_READ: "user:read",
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_RESET_PASSWORD: "user:reset-password",
  ROLE_READ: "role:read",
  ROLE_MANAGE: "role:manage",

  // Academic structure
  DEPARTMENT_READ: "department:read",
  DEPARTMENT_MANAGE: "department:manage",
  PROGRAM_READ: "program:read",
  PROGRAM_MANAGE: "program:manage",
  ACADEMIC_YEAR_MANAGE: "academic-year:manage",
  SEMESTER_MANAGE: "semester:manage",
  COURSE_MANAGE: "course:manage",
  SECTION_MANAGE: "section:manage",

  // Employees
  EMPLOYEE_READ: "employee:read",
  EMPLOYEE_CREATE: "employee:create",
  EMPLOYEE_UPDATE: "employee:update",
  EMPLOYEE_DELETE: "employee:delete",
  EMPLOYEE_PRINT: "employee:print",

  // Documents
  DOCUMENT_UPLOAD: "document:upload",
  DOCUMENT_READ: "document:read",
  DOCUMENT_DELETE: "document:delete",

  // Students
  STUDENT_READ: "student:read",
  STUDENT_MANAGE: "student:manage",

  // Grading
  GRADE_ENTER: "grade:enter",
  GRADE_SUBMIT: "grade:submit",
  GRADE_APPROVE: "grade:approve",
  GRADE_PUBLISH: "grade:publish",
  GRADE_UNLOCK: "grade:unlock",
  GRADING_CONFIG: "grading:config",
  TRANSCRIPT_GENERATE: "transcript:generate",

  // Reports & analytics
  REPORT_VIEW: "report:view",
  ANALYTICS_VIEW: "analytics:view",

  // Platform
  AUDIT_LOG_READ: "audit-log:read",
  SYSTEM_SETTING_MANAGE: "system-setting:manage",

  // Self-service
  OWN_PROFILE_READ: "own-profile:read",
  OWN_PROFILE_UPDATE: "own-profile:update-limited",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
