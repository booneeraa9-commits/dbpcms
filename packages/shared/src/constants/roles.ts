/**
 * The fixed set of role names in DBPCMS. Roles are bundles of permissions.
 * We reference these constants instead of typing raw strings, so a typo is a
 * compile error, not a silent bug.
 */
export const ROLES = {
  SYSTEM_ADMINISTRATOR: "system_administrator",
  HR_OFFICER: "hr_officer",
  DEAN: "dean",
  REGISTRAR: "registrar",
  DEPARTMENT_HEAD: "department_head",
  INSTRUCTOR: "instructor",
  EMPLOYEE: "employee",
  STUDENT: "student",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: RoleName[] = Object.values(ROLES);
