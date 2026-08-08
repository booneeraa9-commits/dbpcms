/**
 * System-wide constants used by both frontend and backend.
 * NEVER hardcode these values elsewhere — always import from here.
 */

// ──────────────────────────────────────────────────────
// User Roles
// ──────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  PRINCIPAL: 'principal',
  ACADEMIC_DEAN: 'academic_dean',
  REGISTRAR: 'registrar',
  DEPARTMENT_HEAD: 'department_head',
  TEACHER: 'teacher',
  EXAM_COMMITTEE: 'exam_committee',
  STUDENT: 'student',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  principal: 'Principal',
  academic_dean: 'Academic Dean',
  registrar: 'Registrar',
  department_head: 'Department Head',
  teacher: 'Teacher',
  exam_committee: 'Exam Committee',
  student: 'Student',
};

// ──────────────────────────────────────────────────────
// Permissions
// ──────────────────────────────────────────────────────
export const PERMISSIONS = {
  // User management
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE_ROLES: 'user:manage_roles',

  // Student management
  STUDENT_VIEW: 'student:view',
  STUDENT_CREATE: 'student:create',
  STUDENT_UPDATE: 'student:update',
  STUDENT_DELETE: 'student:delete',
  STUDENT_IMPORT: 'student:import',
  STUDENT_REGISTRATION_REVIEW: 'student:registration:review',

  // Department / academic structure
  DEPARTMENT_VIEW: 'department:view',
  DEPARTMENT_MANAGE: 'department:manage',
  COURSE_VIEW: 'course:view',
  COURSE_MANAGE: 'course:manage',

  // Question bank
  QUESTION_VIEW: 'question:view',
  QUESTION_CREATE: 'question:create',
  QUESTION_UPDATE: 'question:update',
  QUESTION_DELETE: 'question:delete',
  QUESTION_REVIEW: 'question:review',
  QUESTION_APPROVE: 'question:approve',

  // Exam generation
  EXAM_CREATE: 'exam:create',
  EXAM_VIEW: 'exam:view',
  EXAM_PUBLISH: 'exam:publish',

  // Results
  RESULT_ENTRY: 'result:entry',
  RESULT_VERIFY: 'result:verify',
  RESULT_APPROVE: 'result:approve',
  RESULT_AUTHORIZE: 'result:authorize',
  RESULT_PUBLISH: 'result:publish',
  RESULT_VIEW_OWN: 'result:view_own',

  // Reports
  REPORT_VIEW: 'report:view',
  REPORT_GENERATE: 'report:generate',

  // Audit
  AUDIT_VIEW: 'audit:view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ──────────────────────────────────────────────────────
// Default Role → Permission Mapping
// This is the foundational RBAC table.
// ──────────────────────────────────────────────────────
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: Object.values(PERMISSIONS),

  principal: [PERMISSIONS.USER_VIEW, PERMISSIONS.DEPARTMENT_VIEW, PERMISSIONS.COURSE_VIEW, PERMISSIONS.QUESTION_VIEW, PERMISSIONS.EXAM_VIEW, PERMISSIONS.REPORT_VIEW, PERMISSIONS.AUDIT_VIEW, PERMISSIONS.RESULT_PUBLISH, PERMISSIONS.STUDENT_VIEW],

  academic_dean: [PERMISSIONS.DEPARTMENT_VIEW, PERMISSIONS.COURSE_VIEW, PERMISSIONS.QUESTION_VIEW, PERMISSIONS.EXAM_VIEW, PERMISSIONS.REPORT_VIEW, PERMISSIONS.RESULT_APPROVE, PERMISSIONS.RESULT_VIEW_OWN, PERMISSIONS.STUDENT_VIEW],

  registrar: [PERMISSIONS.STUDENT_VIEW, PERMISSIONS.STUDENT_CREATE, PERMISSIONS.STUDENT_UPDATE, PERMISSIONS.STUDENT_IMPORT, PERMISSIONS.STUDENT_REGISTRATION_REVIEW, PERMISSIONS.RESULT_AUTHORIZE, PERMISSIONS.RESULT_PUBLISH, PERMISSIONS.REPORT_VIEW, PERMISSIONS.USER_VIEW, PERMISSIONS.DEPARTMENT_VIEW, PERMISSIONS.COURSE_VIEW],

  department_head: [
    PERMISSIONS.DEPARTMENT_VIEW,
    PERMISSIONS.DEPARTMENT_MANAGE,
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.QUESTION_REVIEW,
    PERMISSIONS.RESULT_VERIFY,
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.USER_VIEW,
  ],

  teacher: [PERMISSIONS.QUESTION_VIEW, PERMISSIONS.QUESTION_CREATE, PERMISSIONS.QUESTION_UPDATE, PERMISSIONS.RESULT_ENTRY, PERMISSIONS.STUDENT_VIEW, PERMISSIONS.COURSE_VIEW, PERMISSIONS.DEPARTMENT_VIEW],

  exam_committee: [PERMISSIONS.QUESTION_VIEW, PERMISSIONS.QUESTION_APPROVE, PERMISSIONS.EXAM_CREATE, PERMISSIONS.EXAM_VIEW, PERMISSIONS.EXAM_PUBLISH, PERMISSIONS.DEPARTMENT_VIEW, PERMISSIONS.COURSE_VIEW],

  student: [PERMISSIONS.RESULT_VIEW_OWN],
};

// ──────────────────────────────────────────────────────
// Question Types
// ──────────────────────────────────────────────────────
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  MATCHING: 'matching',
  SHORT_ANSWER: 'short_answer',
  ESSAY: 'essay',
  PRACTICAL: 'practical',
} as const;

export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES];

// ──────────────────────────────────────────────────────
// Difficulty Levels
// ──────────────────────────────────────────────────────
export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert',
} as const;

export type Difficulty = (typeof DIFFICULTY_LEVELS)[keyof typeof DIFFICULTY_LEVELS];

// ──────────────────────────────────────────────────────
// Bloom's Taxonomy
// ──────────────────────────────────────────────────────
export const BLOOMS_LEVELS = {
  REMEMBER: 'remember',
  UNDERSTAND: 'understand',
  APPLY: 'apply',
  ANALYZE: 'analyze',
  EVALUATE: 'evaluate',
  CREATE: 'create',
} as const;

export type BloomsLevel = (typeof BLOOMS_LEVELS)[keyof typeof BLOOMS_LEVELS];

export const BLOOMS_LABELS: Record<BloomsLevel, string> = {
  remember: 'Remember',
  understand: 'Understand',
  apply: 'Apply',
  analyze: 'Analyze',
  evaluate: 'Evaluate',
  create: 'Create',
};

// ──────────────────────────────────────────────────────
// Academic Levels
// ──────────────────────────────────────────────────────
export const ACADEMIC_LEVELS = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
  LEVEL_5: 5,
} as const;

export type AcademicLevel = (typeof ACADEMIC_LEVELS)[keyof typeof ACADEMIC_LEVELS];

// ──────────────────────────────────────────────────────
// System constants
// ──────────────────────────────────────────────────────
export const SYSTEM = {
  APP_NAME: 'DBPCMS',
  APP_FULL_NAME: 'Donna Barbar Polytechnic College Management System',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PASSWORD_MIN_LENGTH: 8,
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MIN: 15,
} as const;
