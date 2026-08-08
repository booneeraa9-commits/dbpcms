/**
 * Mock API — localStorage-backed fake backend for preview mode.
 *
 * This is ONLY active when VITE_MOCK_MODE=true in .env.
 * When you have a real backend, set it to false (or remove it) and
 * the real API takes over with zero code changes.
 *
 * Safety guarantees:
 *   - Same response shape as the real API (uses real types from @dbpcms/shared)
 *   - Same error format
 *   - localStorage persistence (survives page refresh)
 *   - Network delay simulation (200-500ms) for realistic UX
 *   - Pre-seeded with realistic Ethiopian TVET sample data
 */

import type {
  ApiResponse, ApiError, PaginatedResponse, User, Role, Permission,
} from '@dbpcms/shared';

export const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

const STORAGE_KEY = 'dbpcms_mock_db';
const SESSION_USER_KEY = 'dbpcms_mock_session';
const DELAY_MIN = 200;
const DELAY_MAX = 500;

const delay = () => new Promise((r) => setTimeout(r, DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN)));

// ─── Database shape ─────────────────────────────────
interface MockDB {
  users: any[];
  roles: any[];
  permissions: any[];
  userRoles: any[];
  departments: any[];
  programs: any[];
  occupations: any[];
  programOccupations: any[];
  programLevels: any[];
  courses: any[];
  competencies: any[];
  courseCompetencies: any[];
  academicYears: any[];
  semesters: any[];
  students: any[];
  studentRegistrations: any[];
  questions: any[];
  examQuestions: any[];
  exams: any[];
  results: any[];
  activityLogs: any[];
  notifications: any[];
}

// ─── Helpers ────────────────────────────────────────
function uuid(): string {
  return crypto.randomUUID();
}

// Seed sample questions across different statuses
function seedQuestions(courses: any[], users: any[]) {
  const teacher = users.find((u) => u.email === 'teacher@dbpc.edu.et');
  const deptHead = users.find((u) => u.email === 'dept.head@dbpc.edu.et');
  const exam = users.find((u) => u.email === 'exam@dbpc.edu.et');
  if (!teacher || !deptHead || !exam) return [];
  const cs101 = courses.find((c) => c.code === 'CS101');
  const cs102 = courses.find((c) => c.code === 'CS102');
  const cs201 = courses.find((c) => c.code === 'CS201');
  const acc101 = courses.find((c) => c.code === 'ACC101');
  if (!cs101 || !cs102 || !cs201 || !acc101) return [];
  const nowStr = now();
  return [
    // ACTIVE question
    {
      id: uuid(), courseId: cs101.id, type: 'MULTIPLE_CHOICE', difficulty: 'EASY',
      bloomsLevel: 'REMEMBER', marks: 2, content: {
        text: 'Which of the following is a valid Python variable name?',
        options: ['2things', 'my-var', '_myvar', 'my var'],
        correctAnswer: 2,
        explanation: 'Variable names can start with underscore or letter, and cannot contain spaces or hyphens.',
      },
      keywords: ['python', 'variables', 'syntax'], attachments: null, status: 'ACTIVE',
      rejectionReason: null, timesUsed: 12, lastUsedAt: nowStr, version: 1, parentId: null,
      createdById: teacher.id, reviewedById: deptHead.id, approvedById: exam.id,
      createdAt: nowStr, updatedAt: nowStr, deletedAt: null,
    },
    // ACTIVE True/False
    {
      id: uuid(), courseId: cs101.id, type: 'TRUE_FALSE', difficulty: 'EASY',
      bloomsLevel: 'REMEMBER', marks: 1, content: {
        text: 'Python is a compiled programming language.',
        correctAnswer: false,
        explanation: 'Python is an interpreted language, not compiled.',
      },
      keywords: ['python', 'interpreter'], attachments: null, status: 'ACTIVE',
      rejectionReason: null, timesUsed: 8, lastUsedAt: nowStr, version: 1, parentId: null,
      createdById: teacher.id, reviewedById: deptHead.id, approvedById: exam.id,
      createdAt: nowStr, updatedAt: nowStr, deletedAt: null,
    },
    // PENDING_REVIEW (waiting for dept head)
    {
      id: uuid(), courseId: cs102.id, type: 'ESSAY', difficulty: 'HARD',
      bloomsLevel: 'EVALUATE', marks: 10, content: {
        text: 'Compare and contrast arrays and linked lists. When would you choose one over the other? Discuss time and space complexity.',
        rubric: 'Award 4 pts for comparison, 3 pts for use cases, 3 pts for complexity analysis.',
        minWords: 200,
      },
      keywords: ['data-structures', 'arrays', 'linked-lists', 'complexity'], attachments: null, status: 'PENDING_REVIEW',
      rejectionReason: null, timesUsed: 0, lastUsedAt: null, version: 1, parentId: null,
      createdById: teacher.id, reviewedById: null, approvedById: null,
      createdAt: nowStr, updatedAt: nowStr, deletedAt: null,
    },
    // PENDING_APPROVAL (waiting for exam committee)
    {
      id: uuid(), courseId: cs201.id, type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM',
      bloomsLevel: 'APPLY', marks: 3, content: {
        text: 'Which SQL clause is used to filter rows in a SELECT statement?',
        options: ['ORDER BY', 'GROUP BY', 'WHERE', 'HAVING'],
        correctAnswer: 2,
        explanation: 'WHERE filters rows before grouping. HAVING filters after.',
      },
      keywords: ['sql', 'database', 'select', 'where'], attachments: null, status: 'PENDING_APPROVAL',
      rejectionReason: null, timesUsed: 0, lastUsedAt: null, version: 1, parentId: null,
      createdById: teacher.id, reviewedById: deptHead.id, approvedById: null,
      createdAt: nowStr, updatedAt: nowStr, deletedAt: null,
    },
    // DRAFT (just created, not submitted)
    {
      id: uuid(), courseId: cs201.id, type: 'SHORT_ANSWER', difficulty: 'MEDIUM',
      bloomsLevel: 'UNDERSTAND', marks: 2, content: {
        text: 'Explain the concept of database normalization in 2-3 sentences.',
        sampleAnswer: 'Normalization organizes data to reduce redundancy and improve integrity by dividing into related tables.',
      },
      keywords: ['database', 'normalization'], attachments: null, status: 'DRAFT',
      rejectionReason: null, timesUsed: 0, lastUsedAt: null, version: 1, parentId: null,
      createdById: teacher.id, reviewedById: null, approvedById: null,
      createdAt: nowStr, updatedAt: nowStr, deletedAt: null,
    },
    // REJECTED
    {
      id: uuid(), courseId: acc101.id, type: 'TRUE_FALSE', difficulty: 'EASY',
      bloomsLevel: 'REMEMBER', marks: 1, content: {
        text: 'Assets are listed on the balance sheet in order of liquidity.',
        correctAnswer: true,
      },
      keywords: ['accounting', 'balance-sheet', 'assets'], attachments: null, status: 'REJECTED',
      rejectionReason: 'Please provide a citation and clarify what "order of liquidity" means specifically.',
      timesUsed: 0, lastUsedAt: null, version: 1, parentId: null,
      createdById: teacher.id, reviewedById: deptHead.id, approvedById: null,
      createdAt: nowStr, updatedAt: nowStr, deletedAt: null,
    },
  ];
}

function now(): string {
  return new Date().toISOString();
}

function success<T>(data: T, meta?: any): ApiResponse<T> {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

function ok<T>(data: T, status?: number): any {
  return { success: true, data, status };
}

function error(code: string, message: string, status = 400, details?: unknown): ApiError {
  return { success: false, error: { code, message, ...(details ? { details } : {}) } };
}

function loadDB(): MockDB {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch {}
  }
  const fresh = seedDB();
  saveDB(fresh);
  return fresh;
}

function saveDB(db: MockDB): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const skip = (page - 1) * pageSize;
  return {
    items: items.slice(skip, skip + pageSize),
    meta: {
      page,
      pageSize,
      total: items.length,
      totalPages: Math.ceil(items.length / pageSize) || 1,
    },
  };
}

// ─── Seed data ──────────────────────────────────────
function seedDB(): MockDB {
  const nowStr = now();
  const dept1 = { id: uuid(), code: 'COMP', name: 'Computing', description: 'Computer Science and IT programs', headId: null, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null };
  const dept2 = { id: uuid(), code: 'BUS', name: 'Business', description: 'Business, Accounting, and Marketing', headId: null, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null };
  const dept3 = { id: uuid(), code: 'ENG', name: 'Engineering', description: 'Civil, Electrical, Mechanical', headId: null, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null };

  const prog1 = { id: uuid(), departmentId: dept1.id, code: 'CS', name: 'Computer Science', description: null, durationYears: 3, totalCredits: 180, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null };
  const prog2 = { id: uuid(), departmentId: dept1.id, code: 'IT', name: 'Information Technology', description: null, durationYears: 3, totalCredits: 170, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null };
  const prog3 = { id: uuid(), departmentId: dept2.id, code: 'ACC', name: 'Accounting', description: null, durationYears: 3, totalCredits: 160, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null };
  const prog4 = { id: uuid(), departmentId: dept2.id, code: 'MKT', name: 'Marketing', description: null, durationYears: 2, totalCredits: 120, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null };
  const prog5 = { id: uuid(), departmentId: dept3.id, code: 'CE', name: 'Civil Engineering', description: null, durationYears: 4, totalCredits: 220, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null };

  // Program levels
  const programLevels = [
    { programId: prog1.id, level: 1 }, { programId: prog1.id, level: 2 }, { programId: prog1.id, level: 3 },
    { programId: prog2.id, level: 1 }, { programId: prog2.id, level: 2 }, { programId: prog2.id, level: 3 },
    { programId: prog3.id, level: 1 }, { programId: prog3.id, level: 2 }, { programId: prog3.id, level: 3 },
    { programId: prog4.id, level: 1 }, { programId: prog4.id, level: 2 },
    { programId: prog5.id, level: 1 }, { programId: prog5.id, level: 2 }, { programId: prog5.id, level: 3 }, { programId: prog5.id, level: 4 },
  ];

  const occ1 = { id: uuid(), code: 'SWDEV', name: 'Software Development', description: 'Build software applications', isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null };
  const occ2 = { id: uuid(), code: 'NETADM', name: 'Network Administration', description: 'Manage computer networks', isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null };
  const occ3 = { id: uuid(), code: 'BOOK', name: 'Bookkeeping', description: 'Financial record keeping', isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null };

  const courses = [
    { id: uuid(), departmentId: dept1.id, programId: prog1.id, code: 'CS101', name: 'Introduction to Programming', description: 'Fundamentals using Python', level: 1, credits: 4, theoryHours: 3, practicalHours: 2, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
    { id: uuid(), departmentId: dept1.id, programId: prog1.id, code: 'CS102', name: 'Data Structures & Algorithms', description: 'Arrays, lists, trees, sorting', level: 2, credits: 4, theoryHours: 3, practicalHours: 2, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
    { id: uuid(), departmentId: dept1.id, programId: prog1.id, code: 'CS201', name: 'Database Design', description: 'Relational databases, SQL, normalization', level: 2, credits: 3, theoryHours: 2, practicalHours: 2, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
    { id: uuid(), departmentId: dept1.id, programId: prog1.id, code: 'CS301', name: 'Web Development', description: 'HTML, CSS, JS, React', level: 3, credits: 4, theoryHours: 2, practicalHours: 4, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
    { id: uuid(), departmentId: dept2.id, programId: prog3.id, code: 'ACC101', name: 'Principles of Accounting', description: 'Basic bookkeeping', level: 1, credits: 3, theoryHours: 3, practicalHours: 1, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
    { id: uuid(), departmentId: dept3.id, programId: prog5.id, code: 'CE101', name: 'Engineering Mathematics', description: 'Calculus and linear algebra', level: 1, credits: 4, theoryHours: 4, practicalHours: 0, isActive: true, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
  ];

  const year1 = { id: uuid(), name: '2025/2026', startDate: '2025-09-01', endDate: '2026-08-31', isCurrent: true, isActive: true, createdAt: nowStr, updatedAt: nowStr };
  const sem1 = { id: uuid(), academicYearId: year1.id, name: 'Semester 1', number: 1, startDate: '2025-09-01', endDate: '2026-01-31', isCurrent: true };
  const sem2 = { id: uuid(), academicYearId: year1.id, name: 'Semester 2', number: 2, startDate: '2026-02-01', endDate: '2026-08-31', isCurrent: false };

  // Roles
  const roles = [
    { id: uuid(), slug: 'super_admin', name: 'Super Admin', description: 'Full access', isSystem: true },
    { id: uuid(), slug: 'principal', name: 'Principal', description: 'Highest academic authority', isSystem: true },
    { id: uuid(), slug: 'academic_dean', name: 'Academic Dean', description: 'Oversees academic affairs', isSystem: true },
    { id: uuid(), slug: 'registrar', name: 'Registrar', description: 'Manages students', isSystem: true },
    { id: uuid(), slug: 'department_head', name: 'Department Head', description: 'Leads a department', isSystem: true },
    { id: uuid(), slug: 'teacher', name: 'Teacher', description: 'Teaches courses', isSystem: true },
    { id: uuid(), slug: 'exam_committee', name: 'Exam Committee', description: 'Approves exams', isSystem: true },
    { id: uuid(), slug: 'student', name: 'Student', description: 'Enrolled learner', isSystem: true },
  ];

  // Sample users (plain passwords for mock — never do this in real app)
  const users = [
    { id: uuid(), email: 'admin@dbpc.edu.et', passwordHash: 'mock:Admin@12345', firstName: 'System', lastName: 'Administrator', phone: null, avatarUrl: null, status: 'ACTIVE', emailVerified: true, emailVerifiedAt: nowStr, failedLoginCount: 0, lockedUntil: null, lastLoginAt: nowStr, lastLoginIp: null, passwordChangedAt: nowStr, mustChangePassword: false, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
    { id: uuid(), email: 'principal@dbpc.edu.et', passwordHash: 'mock:Principal@123', firstName: 'Abebe', lastName: 'Bekele', phone: null, avatarUrl: null, status: 'ACTIVE', emailVerified: true, emailVerifiedAt: nowStr, failedLoginCount: 0, lockedUntil: null, lastLoginAt: nowStr, lastLoginIp: null, passwordChangedAt: nowStr, mustChangePassword: false, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
    { id: uuid(), email: 'dean@dbpc.edu.et', passwordHash: 'mock:Dean@12345', firstName: 'Sara', lastName: 'Tesfaye', phone: null, avatarUrl: null, status: 'ACTIVE', emailVerified: true, emailVerifiedAt: nowStr, failedLoginCount: 0, lockedUntil: null, lastLoginAt: nowStr, lastLoginIp: null, passwordChangedAt: nowStr, mustChangePassword: false, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
    { id: uuid(), email: 'registrar@dbpc.edu.et', passwordHash: 'mock:Registrar@123', firstName: 'Dawit', lastName: 'Haile', phone: null, avatarUrl: null, status: 'ACTIVE', emailVerified: true, emailVerifiedAt: nowStr, failedLoginCount: 0, lockedUntil: null, lastLoginAt: nowStr, lastLoginIp: null, passwordChangedAt: nowStr, mustChangePassword: false, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
    { id: uuid(), email: 'dept.head@dbpc.edu.et', passwordHash: 'mock:DeptHead@123', firstName: 'Meron', lastName: 'Alemu', phone: null, avatarUrl: null, status: 'ACTIVE', emailVerified: true, emailVerifiedAt: nowStr, failedLoginCount: 0, lockedUntil: null, lastLoginAt: nowStr, lastLoginIp: null, passwordChangedAt: nowStr, mustChangePassword: false, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
    { id: uuid(), email: 'teacher@dbpc.edu.et', passwordHash: 'mock:Teacher@123', firstName: 'Yonas', lastName: 'Girma', phone: null, avatarUrl: null, status: 'ACTIVE', emailVerified: true, emailVerifiedAt: nowStr, failedLoginCount: 0, lockedUntil: null, lastLoginAt: nowStr, lastLoginIp: null, passwordChangedAt: nowStr, mustChangePassword: false, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
    { id: uuid(), email: 'exam@dbpc.edu.et', passwordHash: 'mock:Exam@12345', firstName: 'Hanna', lastName: 'Worku', phone: null, avatarUrl: null, status: 'ACTIVE', emailVerified: true, emailVerifiedAt: nowStr, failedLoginCount: 0, lockedUntil: null, lastLoginAt: nowStr, lastLoginIp: null, passwordChangedAt: nowStr, mustChangePassword: false, createdAt: nowStr, updatedAt: nowStr, deletedAt: null },
  ];

  // Map users to roles
  const userRoles = users.map((u, i) => ({
    userId: u.id,
    roleId: roles[i].id,
    grantedAt: nowStr,
  }));

  // Sample students
  type StudentSeed = [string, string | null, string, string, string, string, number, string];
  const studentNames: StudentSeed[] = [
    ['Abel', 'Kebede', 'Tesfaye', 'MALE', '2005-03-12', prog1.id, 1, 'A'],
    ['Hanna', null, 'Worku', 'FEMALE', '2004-08-25', prog1.id, 1, 'A'],
    ['Yonas', 'Alemu', 'Bekele', 'MALE', '2003-11-04', prog1.id, 2, 'B'],
    ['Meron', null, 'Tesfa', 'FEMALE', '2005-05-18', prog3.id, 1, 'A'],
    ['Dawit', 'Haile', 'Girma', 'MALE', '2002-07-09', prog5.id, 3, 'A'],
    ['Sara', null, 'Alemu', 'FEMALE', '2004-02-14', prog3.id, 2, 'A'],
    ['Bereket', null, 'Tadesse', 'MALE', '2005-09-30', prog2.id, 1, 'B'],
    ['Lidya', 'Kebede', 'Bekele', 'FEMALE', '2005-11-22', prog4.id, 1, 'A'],
    ['Tesfaye', null, 'Mekonnen', 'MALE', '2004-04-18', prog1.id, 2, 'A'],
    ['Selam', null, 'Gebre', 'FEMALE', '2005-07-25', prog2.id, 1, 'A'],
    ['Henok', 'Teka', 'Asefa', 'MALE', '2003-12-05', prog5.id, 2, 'B'],
    ['Rahel', null, 'Tesfaye', 'FEMALE', '2004-06-30', prog3.id, 2, 'A'],
  ];

  const students = studentNames.map(([first, middle, last, gender, dob, programId, level, section], i) => {
    const year = (2025 - level + 1).toString();
    return {
      id: uuid(),
      studentIdNumber: `DBPC/${year}/${String(i + 1).padStart(4, '0')}`,
      firstName: first,
      middleName: middle,
      lastName: last,
      gender,
      birthDate: new Date(dob).toISOString(),
      age: new Date().getFullYear() - new Date(dob).getFullYear(),
      nationalId: i % 2 === 0 ? `ET${1000000 + i}` : null,
      phone: `+2519${String(10000000 + i * 123456).slice(0, 8)}`,
      email: `${first.toLowerCase()}@example.com`,
      address: ['Addis Ababa', 'Dire Dawa', 'Bahir Dar', 'Hawassa', 'Mekelle', 'Jimma', 'Adama', 'Dessie'][i % 8],
      photoUrl: null,
      qrCodeUrl: null,
      guardianName: i % 3 === 0 ? `Mr ${last}` : null,
      guardianPhone: i % 3 === 0 ? `+2519${String(20000000 + i).slice(0, 8)}` : null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      previousSchool: ['Addis Ababa Sec. School', 'Dire Dawa High', 'Bahir Dar TVET', 'Hawassa Prep'][i % 4],
      previousGrade: 'Pass',
      programId,
      admissionDate: `${year}-09-01T00:00:00Z`,
      status: 'ACTIVE',
      statusUpdatedAt: null,
      createdAt: nowStr,
      updatedAt: nowStr,
      deletedAt: null,
    };
  });

  const studentRegistrations = students.map((s, i) => ({
    id: uuid(),
    studentId: s.id,
    academicYearId: year1.id,
    level: studentNames[i][6],
    section: studentNames[i][7],
    rollNumber: String(i + 1).padStart(3, '0'),
    registeredAt: nowStr,
    registeredBy: users[0].id,
    isActive: true,
  }));

  // Seed a few sample notifications so the bell shows content
  const deptHead = users.find((u) => u.email === 'dept.head@dbpc.edu.et');
  const dean = users.find((u) => u.email === 'dean@dbpc.edu.et');
  const teacher = users.find((u) => u.email === 'teacher@dbpc.edu.et');
  const exam = users.find((u) => u.email === 'exam@dbpc.edu.et');
  const notifications = [
    deptHead ? {
      id: uuid(), userId: deptHead.id, type: 'RESULT_SUBMITTED',
      title: '📝 3 results awaiting verification',
      message: 'Yonas Girma submitted CS101 exam results for verification.',
      data: null, readAt: null,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    } : null,
    dean ? {
      id: uuid(), userId: dean.id, type: 'QUESTION_PENDING_APPROVAL',
      title: '📚 Question awaiting approval',
      message: 'CS201: "Which SQL clause is used to filter rows?" needs final approval.',
      data: null, readAt: null,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    } : null,
    teacher ? {
      id: uuid(), userId: teacher.id, type: 'QUESTION_REJECTED',
      title: '✗ Question needs revision',
      message: 'ACC101: Please provide a citation and clarify "order of liquidity".',
      data: null, readAt: null,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    } : null,
    users[0] ? {
      id: uuid(), userId: users[0].id, type: 'SYSTEM',
      title: '🎉 Welcome to DBPCMS v1.0',
      message: 'Your system is ready. All 12 students are registered for 2025/2026.',
      data: null, readAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    } : null,
  ].filter(Boolean);

  const activityLogs = [
    { id: uuid(), userId: users[0].id, action: 'LOGIN', resource: null, resourceId: null, description: 'System admin logged in', metadata: null, ipAddress: '127.0.0.1', userAgent: 'Mock Browser', createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
    teacher ? { id: uuid(), userId: teacher.id, action: 'CREATE', resource: 'question', resourceId: 'q1', description: 'Created new MCQ for CS101', metadata: null, ipAddress: '127.0.0.1', userAgent: 'Mock Browser', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() } : null,
    deptHead ? { id: uuid(), userId: deptHead.id, action: 'APPROVE', resource: 'question', resourceId: 'q1', description: 'Approved CS101 question for approval stage', metadata: null, ipAddress: '127.0.0.1', userAgent: 'Mock Browser', createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString() } : null,
    exam ? { id: uuid(), userId: exam.id, action: 'APPROVE', resource: 'question', resourceId: 'q1', description: 'Final approval: question is now ACTIVE', metadata: null, ipAddress: '127.0.0.1', userAgent: 'Mock Browser', createdAt: new Date(Date.now() - 80 * 60 * 1000).toISOString() } : null,
    { id: uuid(), userId: users[0].id, action: 'CREATE', resource: 'student', resourceId: 's1', description: 'Registered Abel Tesfaye (DBPC/2025/0001)', metadata: null, ipAddress: '127.0.0.1', userAgent: 'Mock Browser', createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  ].filter(Boolean);

  // ... rest unchanged
  const _dummy = activityLogs; // keep reference for closure

  return {
    users,
    roles,
    permissions: [],
    userRoles,
    departments: [dept1, dept2, dept3],
    programs: [prog1, prog2, prog3, prog4, prog5],
    occupations: [occ1, occ2, occ3],
    programOccupations: [],
    programLevels,
    courses,
    competencies: [],
    courseCompetencies: [],
    academicYears: [year1],
    semesters: [sem1, sem2],
    students,
    studentRegistrations,
    questions: seedQuestions(courses, users),
    examQuestions: [],
    exams: [],
    results: [],
    activityLogs,
    notifications,
  };
}

// ─── API implementation ─────────────────────────────
export const mockApi = {
  // ── Auth ──
  async login(email: string, password: string): Promise<ApiResponse<{ user: any; tokens: { accessToken: string; refreshToken: string } }>> {
    await delay();
    const db = loadDB();
    const user = db.users.find((u) => u.email === email.toLowerCase() && !u.deletedAt);
    if (!user || user.passwordHash !== `mock:${password}`) {
      return error('UNAUTHORIZED', 'Invalid email or password', 401);
    }
    user.lastLoginAt = now();
    saveDB(db);
    const tokens = { accessToken: `mock-access-${uuid()}`, refreshToken: `mock-refresh-${uuid()}` };
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify({ user, tokens }));
    const userRoles = db.userRoles.filter((ur) => ur.userId === user.id);
    const roles = userRoles.map((ur) => db.roles.find((r) => r.id === ur.roleId)?.slug).filter(Boolean);
    return success({ user: serializeUser(user, roles), tokens });
  },

  async me(): Promise<ApiResponse<any>> {
    await delay();
    const session = localStorage.getItem(SESSION_USER_KEY);
    if (!session) return error('UNAUTHORIZED', 'Not authenticated', 401);
    const { user, tokens } = JSON.parse(session);
    const db = loadDB();
    const fresh = db.users.find((u) => u.id === user.id);
    if (!fresh || fresh.deletedAt) return error('UNAUTHORIZED', 'User not found', 401);
    const userRoles = db.userRoles.filter((ur) => ur.userId === fresh.id);
    const roles = userRoles.map((ur) => db.roles.find((r) => r.id === ur.roleId)?.slug).filter(Boolean);
    return success(serializeUser(fresh, roles));
  },

  async logout(): Promise<ApiResponse<{ message: string }>> {
    localStorage.removeItem(SESSION_USER_KEY);
    return success({ message: 'Logged out' });
  },

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string; devResetToken?: string }>> {
    await delay();
    const db = loadDB();
    const user = db.users.find((u) => u.email === email.toLowerCase());
    if (!user) return success({ message: 'If the email exists, a reset link has been sent', devResetToken: 'mock-reset-token-' + uuid().slice(0, 8) });
    return success({ message: 'If the email exists, a reset link has been sent', devResetToken: 'mock-reset-token-' + uuid().slice(0, 8) });
  },

  async changePassword(_currentPassword: string, _newPassword: string): Promise<ApiResponse<{ message: string }>> {
    await delay();
    return success({ message: 'Password changed successfully' });
  },

  async listDepartments(params: any = {}): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const filtered = db.departments.filter((d) => !d.deletedAt);
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    return success(paginate(filtered, page, pageSize).items, paginate(filtered, page, pageSize).meta);
  },

  async getActiveDepartments(): Promise<ApiResponse<any[]>> {
    await delay();
    const db = loadDB();
    return success(db.departments.filter((d) => !d.deletedAt && d.isActive).map((d) => ({ id: d.id, code: d.code, name: d.name })));
  },

  async createDepartment(input: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const dept = { id: uuid(), ...input, isActive: true, createdAt: now(), updatedAt: now(), deletedAt: null };
    db.departments.push(dept);
    saveDB(db);
    return success(dept) as any;
  },

  async deleteDepartment(id: string): Promise<void> {
    await delay();
    const db = loadDB();
    const dept = db.departments.find((d) => d.id === id);
    if (dept) {
      dept.deletedAt = now();
      dept.isActive = false;
      saveDB(db);
    }
  },

  async listPrograms(params: any = {}): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    let filtered = db.programs.filter((p) => !p.deletedAt);
    if (params.departmentId) filtered = filtered.filter((p) => p.departmentId === params.departmentId);
    const enriched = filtered.map((p) => ({
      ...p,
      departmentName: db.departments.find((d) => d.id === p.departmentId)?.name,
      levels: db.programLevels.filter((pl) => pl.programId === p.id).map((pl) => pl.level),
      occupations: [],
      _count: { students: db.students.filter((s) => s.programId === p.id && !s.deletedAt).length, courses: db.courses.filter((c) => c.programId === p.id && !c.deletedAt).length },
    }));
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    return success(paginate(enriched, page, pageSize).items, paginate(enriched, page, pageSize).meta);
  },

  async createProgram(input: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const { levels, occupationIds, ...rest } = input;
    const program = { id: uuid(), ...rest, isActive: true, createdAt: now(), updatedAt: now(), deletedAt: null };
    db.programs.push(program);
    if (levels) {
      db.programLevels.push(...levels.map((l: number) => ({ programId: program.id, level: l })));
    }
    saveDB(db);
    return success(program) as any;
  },

  async deleteProgram(id: string): Promise<void> {
    await delay();
    const db = loadDB();
    const p = db.programs.find((x) => x.id === id);
    if (p) { p.deletedAt = now(); p.isActive = false; saveDB(db); }
  },

  async listCourses(params: any = {}): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    let filtered = db.courses.filter((c) => !c.deletedAt);
    if (params.departmentId) filtered = filtered.filter((c) => c.departmentId === params.departmentId);
    const enriched = filtered.map((c) => ({
      ...c,
      departmentName: db.departments.find((d) => d.id === c.departmentId)?.name,
      programName: db.programs.find((p) => p.id === c.programId)?.name,
      competencies: [],
      _count: { questions: 0, assignments: 0 },
    }));
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    return success(paginate(enriched, page, pageSize).items, paginate(enriched, page, pageSize).meta);
  },

  async createCourse(input: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const { competencyIds, ...rest } = input;
    const course = { id: uuid(), ...rest, isActive: true, createdAt: now(), updatedAt: now(), deletedAt: null };
    db.courses.push(course);
    saveDB(db);
    return success(course) as any;
  },

  async deleteCourse(id: string): Promise<void> {
    await delay();
    const db = loadDB();
    const c = db.courses.find((x) => x.id === id);
    if (c) { c.deletedAt = now(); c.isActive = false; saveDB(db); }
  },

  async listOccupations(): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    return success(db.occupations.filter((o) => !o.deletedAt));
  },

  async getActiveOccupations(): Promise<ApiResponse<any[]>> {
    await delay();
    const db = loadDB();
    return success(db.occupations.filter((o) => !o.deletedAt && o.isActive).map((o) => ({ id: o.id, code: o.code, name: o.name })));
  },

  async createOccupation(input: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const occ = { id: uuid(), ...input, isActive: true, createdAt: now(), updatedAt: now(), deletedAt: null };
    db.occupations.push(occ);
    saveDB(db);
    return success(occ) as any;
  },

  async listCompetencies(): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    return success(db.competencies.filter((c) => !c.deletedAt));
  },

  async createCompetency(input: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const comp = { id: uuid(), ...input, createdAt: now(), updatedAt: now(), deletedAt: null };
    db.competencies.push(comp);
    saveDB(db);
    return success(comp) as any;
  },

  async listAcademicYears(): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const enriched = db.academicYears.map((y) => ({
      ...y,
      semesters: db.semesters.filter((s) => s.academicYearId === y.id),
    }));
    return success(enriched);
  },

  async getCurrentAcademicYear(): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const year = db.academicYears.find((y) => y.isCurrent);
    const semester = db.semesters.find((s) => s.isCurrent);
    return success({ year, semester });
  },

  async createAcademicYear(input: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (input.isCurrent) db.academicYears.forEach((y) => y.isCurrent = false);
    const year = { id: uuid(), ...input, isActive: true, createdAt: now(), updatedAt: now() };
    db.academicYears.push(year);
    saveDB(db);
    return success(year) as any;
  },

  async listStudents(params: any = {}): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    let filtered = db.students.filter((s) => !s.deletedAt);
    if (params.status) filtered = filtered.filter((s) => s.status === params.status);
    if (params.programId) filtered = filtered.filter((s) => s.programId === params.programId);
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter((s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.studentIdNumber.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
      );
    }
    const enriched = filtered.map((s) => {
      const reg = db.studentRegistrations
        .filter((r) => r.studentId === s.id)
        .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))[0];
      const year = reg ? db.academicYears.find((y) => y.id === reg.academicYearId) : null;
      const program = db.programs.find((p) => p.id === s.programId);
      const dept = program ? db.departments.find((d) => d.id === program.departmentId) : null;
      return {
        ...s,
        programName: program?.name,
        programCode: program?.code,
        departmentName: dept?.name,
        age: new Date().getFullYear() - new Date(s.birthDate).getFullYear(),
        currentRegistration: reg ? { academicYearId: reg.academicYearId, academicYearName: year?.name, level: reg.level, section: reg.section } : null,
        _count: { registrations: db.studentRegistrations.filter((r) => r.studentId === s.id).length, results: 0 },
      };
    });
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    return success(paginate(enriched, page, pageSize).items, paginate(enriched, page, pageSize).meta);
  },

  async getStudent(id: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const s = db.students.find((x) => x.id === id && !x.deletedAt);
    if (!s) return error('NOT_FOUND', 'Student not found', 404);
    const regs = db.studentRegistrations.filter((r) => r.studentId === id);
    const program = db.programs.find((p) => p.id === s.programId);
    const dept = program ? db.departments.find((d) => d.id === program.departmentId) : null;
    const enriched = {
      ...s,
      programName: program?.name,
      programCode: program?.code,
      departmentName: dept?.name,
      age: new Date().getFullYear() - new Date(s.birthDate).getFullYear(),
      currentRegistration: regs[0] ? { academicYearId: regs[0].academicYearId, academicYearName: db.academicYears.find((y) => y.id === regs[0].academicYearId)?.name, level: regs[0].level, section: regs[0].section } : null,
      _count: { registrations: regs.length, results: 0 },
    };
    return success(enriched);
  },

  async createStudent(input: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const year = new Date(input.admissionDate).getFullYear();
    const count = db.students.filter((s) => s.studentIdNumber.startsWith(`DBPC/${year}/`)).length;
    const student = {
      id: uuid(),
      studentIdNumber: `DBPC/${year}/${String(count + 1).padStart(4, '0')}`,
      ...input,
      middleName: input.middleName || null,
      nationalId: input.nationalId || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      guardianName: input.guardianName || null,
      guardianPhone: input.guardianPhone || null,
      emergencyContactName: input.emergencyContactName || null,
      emergencyContactPhone: input.emergencyContactPhone || null,
      previousSchool: input.previousSchool || null,
      previousGrade: input.previousGrade || null,
      qrCodeUrl: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>`, // placeholder
      photoUrl: null,
      status: 'ACTIVE',
      statusUpdatedAt: null,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };
    db.students.push(student);
    // Auto-register for current year
    const currentYear = db.academicYears.find((y) => y.isCurrent);
    if (currentYear) {
      db.studentRegistrations.push({
        id: uuid(),
        studentId: student.id,
        academicYearId: currentYear.id,
        level: input.initialLevel || 1,
        section: null,
        rollNumber: null,
        registeredAt: now(),
        registeredBy: null,
        isActive: true,
      });
    }
    saveDB(db);
    return success(student) as any;
  },

  async deleteStudent(id: string): Promise<void> {
    await delay();
    const db = loadDB();
    const s = db.students.find((x) => x.id === id);
    if (s) { s.deletedAt = now(); s.status = 'WITHDRAWN'; saveDB(db); }
  },

  async bulkImportStudents(students: any[]): Promise<ApiResponse<any>> {
    await delay();
    const created: any[] = [];
    const failed: any[] = [];
    for (const data of students) {
      try {
        const res = await this.createStudent(data);
        if (res.success) created.push(res.data);
        else failed.push({ data, reason: 'Unknown error' });
      } catch (err: any) {
        failed.push({ data, reason: err.message });
      }
    }
    return success({ created: created.length, failed, students: created });
  },

  async registerStudent(studentId: string, input: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const reg = {
      id: uuid(),
      studentId,
      academicYearId: input.academicYearId,
      level: input.level,
      section: input.section || null,
      rollNumber: input.rollNumber || null,
      registeredAt: now(),
      registeredBy: null,
      isActive: true,
    };
    db.studentRegistrations.push(reg);
    saveDB(db);
    return success(reg) as any;
  },

  async listUsers(): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const enriched = db.users.filter((u) => !u.deletedAt).map((u) => {
      const userRoles = db.userRoles.filter((ur) => ur.userId === u.id);
      const roles = userRoles.map((ur) => db.roles.find((r) => r.id === ur.roleId)?.slug).filter(Boolean);
      return { ...serializeUser(u, roles), _count: undefined };
    });
    return success(enriched);
  },

  async getRoles(): Promise<ApiResponse<any[]>> {
    await delay();
    const db = loadDB();
    return success(db.roles.map((r) => ({ id: r.id, slug: r.slug, name: r.name, description: r.description })));
  },

  // ─── Exams ───
  // ─── Results ───
  async listResults(params: any = {}): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.results) db.results = [];
    let filtered = db.results;
    if (params.studentId) filtered = filtered.filter((r: any) => r.studentId === params.studentId);
    if (params.semesterId) filtered = filtered.filter((r: any) => r.semesterId === params.semesterId);
    if (params.courseId) filtered = filtered.filter((r: any) => r.courseId === params.courseId);
    if (params.status) filtered = filtered.filter((r: any) => r.status === params.status);
    const enriched = filtered.map((r: any) => this.serializeResult(r, db));
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    return success(paginate(enriched, page, pageSize).items, paginate(enriched, page, pageSize).meta);
  },

  async getResult(id: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.results) db.results = [];
    const r = db.results.find((x: any) => x.id === id);
    if (!r) return error('NOT_FOUND', 'Result not found', 404);
    return success(this.serializeResult(r, db));
  },

  async createResult(input: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.results) db.results = [];
    if (input.marksObtained > input.marksTotal) {
      return error('BAD_REQUEST', 'Marks obtained cannot exceed total marks', 400);
    }
    const student = db.students.find((s: any) => s.id === input.studentId);
    if (!student) return error('BAD_REQUEST', 'Student not found', 400);
    const course = db.courses.find((c: any) => c.id === input.courseId);
    if (!course) return error('BAD_REQUEST', 'Course not found', 400);
    const existing = db.results.find((r: any) =>
      r.studentId === input.studentId && r.semesterId === input.semesterId &&
      r.courseId === input.courseId && r.assessmentType === input.assessmentType
    );
    if (existing) return error('BAD_REQUEST', 'Result already exists for this student/course/assessment', 400);
    const pct = input.marksTotal > 0 ? (input.marksObtained / input.marksTotal) * 100 : 0;
    const competency = pct >= 50 ? 'COMPETENT' : 'NOT_YET_COMPETENT';
    const r = {
      id: uuid(),
      studentId: input.studentId,
      semesterId: input.semesterId,
      courseId: input.courseId,
      assessmentType: input.assessmentType,
      marksObtained: input.marksObtained,
      marksTotal: input.marksTotal,
      competencyLevel: input.competencyLevel || competency,
      remarks: input.remarks || null,
      status: 'DRAFT',
      enteredById: null,
      enteredAt: now(),
      verifiedById: null,
      verifiedAt: null,
      approvedById: null,
      approvedAt: null,
      authorizedById: null,
      authorizedAt: null,
      publishedAt: null,
      createdAt: now(),
      updatedAt: now(),
    };
    db.results.push(r);
    saveDB(db);
    return success(this.serializeResult(r, db)) as any;
  },

  async bulkCreateResults(results: any[]): Promise<ApiResponse<any>> {
    await delay();
    let created = 0;
    const failed: any[] = [];
    for (const data of results) {
      const res = await this.createResult(data);
      if (res.success) created++;
      else failed.push({ data, reason: (res as any).error?.message });
    }
    return success({ created, failed });
  },

  async workflowResult(id: string, action: string, userId: string, reason?: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.results) db.results = [];
    const r = db.results.find((x: any) => x.id === id);
    if (!r) return error('NOT_FOUND', 'Result not found', 404);

    const transitions: Record<string, { from: string[]; to: string; field?: string; act: string }> = {
      submit: { from: ['DRAFT'], to: 'PENDING_VERIFICATION', act: 'VERIFY' },
      verify: { from: ['PENDING_VERIFICATION'], to: 'PENDING_APPROVAL', field: 'verifiedBy', act: 'VERIFY' },
      approve: { from: ['PENDING_APPROVAL'], to: 'PENDING_AUTHORIZATION', field: 'approvedBy', act: 'APPROVE' },
      authorize: { from: ['PENDING_AUTHORIZATION'], to: 'PUBLISHED', field: 'authorizedBy', act: 'AUTHORIZE' },
      publish: { from: ['DRAFT', 'PENDING_VERIFICATION', 'PENDING_APPROVAL', 'PENDING_AUTHORIZATION'], to: 'PUBLISHED', act: 'PUBLISH' },
    };

    if (action === 'reject') {
      if (r.status === 'PUBLISHED') return error('BAD_REQUEST', 'Cannot reject a published result', 400);
      r.status = 'DRAFT';
      r.verifiedById = null; r.verifiedAt = null;
      r.approvedById = null; r.approvedAt = null;
      r.authorizedById = null; r.authorizedAt = null;
      if (reason) r.remarks = `Rejected: ${reason}`;
      r.updatedAt = now();
      saveDB(db);
      return success(this.serializeResult(r, db));
    }

    const t = transitions[action];
    if (!t) return error('BAD_REQUEST', `Unknown action: ${action}`, 400);
    if (!t.from.includes(r.status)) return error('BAD_REQUEST', `Cannot ${action} from status ${r.status}`, 400);

    r.status = t.to as any;
    if (t.field === 'verifiedBy') { r.verifiedById = userId; r.verifiedAt = now(); }
    if (t.field === 'approvedBy') { r.approvedById = userId; r.approvedAt = now(); }
    if (t.field === 'authorizedBy') { r.authorizedById = userId; r.authorizedAt = now(); }
    if (t.to === 'PUBLISHED') r.publishedAt = now();
    r.updatedAt = now();
    saveDB(db);
    return success(this.serializeResult(r, db));
  },

  async getTranscript(studentId: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.results) db.results = [];
    const results = db.results
      .filter((r: any) => r.studentId === studentId && r.status === 'PUBLISHED')
      .map((r: any) => this.serializeResult(r, db));
    const student = db.students.find((s: any) => s.id === studentId);
    if (results.length === 0) {
      return success({ student, results, summary: { totalCourses: 0, average: 0, gpa: 'N/A', passed: 0, failed: 0, competent: 0 } });
    }
    const pcts = results.map((r: any) => r.percentage);
    const avg = pcts.reduce((s: number, p: number) => s + p, 0) / pcts.length;
    const passed = results.filter((r: any) => r.isPass).length;
    const competent = results.filter((r: any) => r.competencyLevel === 'COMPETENT').length;
    return success({
      student,
      results,
      summary: {
        totalCourses: results.length,
        average: Math.round(avg * 100) / 100,
        gpa: avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : avg >= 60 ? 'D' : avg >= 50 ? 'E' : 'F',
        passed,
        failed: results.length - passed,
        competent,
      },
    });
  },

  serializeResult(r: any, db: any) {
    const obtained = Number(r.marksObtained);
    const total = Number(r.marksTotal);
    const pct = total > 0 ? Math.round((obtained / total) * 10000) / 100 : 0;
    const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : pct >= 50 ? 'E' : 'F';
    const student = r.student || db.students?.find((s: any) => s.id === r.studentId);
    const course = r.course || db.courses?.find((c: any) => c.id === r.courseId);
    const semester = r.semester || db.semesters?.find((s: any) => s.id === r.semesterId);
    const findUser = (id: string) => id ? db.users?.find((u: any) => u.id === id) : null;
    const enteredBy = findUser(r.enteredById);
    const verifiedBy = findUser(r.verifiedById);
    const approvedBy = findUser(r.approvedById);
    const authorizedBy = findUser(r.authorizedById);
    return {
      ...r,
      marksObtained: obtained,
      marksTotal: total,
      percentage: pct,
      grade,
      isPass: pct >= 50,
      studentName: student ? `${student.firstName} ${student.lastName}` : undefined,
      studentIdNumber: student?.studentIdNumber,
      courseName: course?.name,
      courseCode: course?.code,
      semesterName: semester?.name,
      enteredByName: enteredBy ? `${enteredBy.firstName} ${enteredBy.lastName}` : undefined,
      verifiedByName: verifiedBy ? `${verifiedBy.firstName} ${verifiedBy.lastName}` : undefined,
      approvedByName: approvedBy ? `${approvedBy.firstName} ${approvedBy.lastName}` : undefined,
      authorizedByName: authorizedBy ? `${authorizedBy.firstName} ${authorizedBy.lastName}` : undefined,
    };
  },

  async listExams(params: any = {}): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.exams) db.exams = [];
    let filtered = db.exams;
    if (params.courseId) filtered = filtered.filter((e: any) => e.courseId === params.courseId);
    if (params.semesterId) filtered = filtered.filter((e: any) => e.semesterId === params.semesterId);
    if (params.status) filtered = filtered.filter((e: any) => e.status === params.status);
    if (params.search) {
      const term = params.search.toLowerCase();
      filtered = filtered.filter((e: any) => e.title.toLowerCase().includes(term));
    }
    const enriched = filtered.map((e: any) => {
      const course = db.courses.find((c: any) => c.id === e.courseId);
      const semester = db.semesters?.find((s: any) => s.id === e.semesterId);
      const qCount = (db.examQuestions || []).filter((eq: any) => eq.examId === e.id).length;
      return {
        ...e,
        courseName: course?.name,
        courseCode: course?.code,
        semesterName: semester?.name,
        questionCount: qCount,
        _count: { examQuestions: qCount },
      };
    });
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    return success(paginate(enriched, page, pageSize).items, paginate(enriched, page, pageSize).meta);
  },

  async getExam(id: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.exams) db.exams = [];
    const e = db.exams.find((x: any) => x.id === id);
    if (!e) return error('NOT_FOUND', 'Exam not found', 404);
    const course = db.courses.find((c: any) => c.id === e.courseId);
    const semester = db.semesters?.find((s: any) => s.id === e.semesterId);
    const examQuestions = (db.examQuestions || [])
      .filter((eq: any) => eq.examId === id)
      .sort((a: any, b: any) => a.order - b.order)
      .map((eq: any) => {
        const q = db.questions.find((x: any) => x.id === eq.questionId);
        return { ...eq, question: q ? { ...q, marks: Number(q.marks), courseName: course?.name, courseCode: course?.code } : null };
      });
    return success({
      ...e,
      courseName: course?.name,
      courseCode: course?.code,
      semesterName: semester?.name,
      examQuestions,
      questionCount: examQuestions.length,
      _count: { examQuestions: examQuestions.length },
    });
  },

  async createExam(input: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.exams) db.exams = [];
    if (!db.examQuestions) db.examQuestions = [];
    const course = db.courses.find((c: any) => c.id === input.courseId);
    if (!course) return error('BAD_REQUEST', 'Course not found', 400);
    const e = {
      id: uuid(),
      title: input.title,
      courseId: input.courseId,
      semesterId: input.semesterId,
      durationMinutes: input.durationMinutes,
      totalMarks: input.totalMarks,
      instructions: input.instructions || null,
      difficultyDistribution: input.difficultyDistribution || null,
      status: 'DRAFT',
      scheduledAt: input.scheduledAt || null,
      publishedAt: null,
      archivedAt: null,
      createdById: '',
      createdAt: now(),
      updatedAt: now(),
    };
    db.exams.push(e);
    saveDB(db);
    return success({ ...e, courseName: course.name, courseCode: course.code, questionCount: 0, _count: { examQuestions: 0 } }) as any;
  },

  async updateExam(id: string, input: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const e = db.exams.find((x: any) => x.id === id);
    if (!e) return error('NOT_FOUND', 'Exam not found', 404);
    if (e.status === 'PUBLISHED') return error('BAD_REQUEST', 'Cannot edit published exam', 400);
    Object.assign(e, { ...input, updatedAt: now() });
    saveDB(db);
    return success(e);
  },

  async deleteExam(id: string): Promise<void> {
    await delay();
    const db = loadDB();
    db.exams = (db.exams || []).filter((e: any) => e.id !== id);
    db.examQuestions = (db.examQuestions || []).filter((eq: any) => eq.examId !== id);
    saveDB(db);
  },

  async autoGenerateExam(id: string, config: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.examQuestions) db.examQuestions = [];
    const e = db.exams.find((x: any) => x.id === id);
    if (!e) return error('NOT_FOUND', 'Exam not found', 404);
    const existing = new Set(db.examQuestions.filter((eq: any) => eq.examId === id).map((eq: any) => eq.questionId));
    const distribution = config.difficultyDistribution || { EASY: 30, MEDIUM: 50, HARD: 20 };
    const total = (distribution.EASY || 0) + (distribution.MEDIUM || 0) + (distribution.HARD || 0) || 1;
    const pickCount = {
      EASY: Math.round(((distribution.EASY || 0) / total) * config.totalQuestions),
      MEDIUM: Math.round(((distribution.MEDIUM || 0) / total) * config.totalQuestions),
      HARD: Math.round(((distribution.HARD || 0) / total) * config.totalQuestions),
    };
    const picked: any[] = [];
    for (const type of config.types || ['MULTIPLE_CHOICE', 'TRUE_FALSE']) {
      for (const [diff, count] of Object.entries(pickCount) as [string, number][]) {
        if (count === 0) continue;
        const candidates = db.questions
          .filter((q: any) => q.courseId === e.courseId && q.type === type && q.difficulty === diff && q.status === 'ACTIVE' && !existing.has(q.id))
          .sort((a: any, b: any) => a.timesUsed - b.timesUsed)
          .slice(0, count);
        for (const q of candidates) {
          picked.push(q);
          existing.add(q.id);
        }
      }
    }
    if (picked.length === 0) return error('BAD_REQUEST', 'No questions matched the criteria', 400);
    const startOrder = db.examQuestions.filter((eq: any) => eq.examId === id).length;
    picked.forEach((q, i) => {
      db.examQuestions.push({
        id: uuid(),
        examId: id,
        questionId: q.id,
        order: startOrder + i,
        marks: Number(q.marks),
      });
      q.timesUsed = (q.timesUsed || 0) + 1;
      q.lastUsedAt = now();
    });
    saveDB(db);
    return this.getExam(id);
  },

  async addQuestionsToExam(id: string, questions: any[]): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.examQuestions) db.examQuestions = [];
    const existing = new Set(db.examQuestions.filter((eq: any) => eq.examId === id).map((eq: any) => eq.questionId));
    const startOrder = db.examQuestions.filter((eq: any) => eq.examId === id).length;
    let added = 0;
    questions.forEach((q, i) => {
      if (!existing.has(q.questionId)) {
        db.examQuestions.push({ id: uuid(), examId: id, questionId: q.questionId, order: startOrder + i, marks: q.marks });
        const question = db.questions.find((x: any) => x.id === q.questionId);
        if (question) { question.timesUsed = (question.timesUsed || 0) + 1; question.lastUsedAt = now(); }
        added++;
      }
    });
    saveDB(db);
    return this.getExam(id);
  },

  async removeQuestionFromExam(examId: string, questionId: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    db.examQuestions = (db.examQuestions || []).filter((eq: any) => !(eq.examId === examId && eq.questionId === questionId));
    const q = db.questions.find((x: any) => x.id === questionId);
    if (q && q.timesUsed > 0) q.timesUsed--;
    saveDB(db);
    return this.getExam(examId);
  },

  async publishExam(id: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const e = db.exams.find((x: any) => x.id === id);
    if (!e) return error('NOT_FOUND', 'Exam not found', 404);
    if (e.status === 'PUBLISHED') return success(e);
    const hasQuestions = (db.examQuestions || []).some((eq: any) => eq.examId === id);
    if (!hasQuestions) return error('BAD_REQUEST', 'Cannot publish exam with no questions', 400);
    e.status = 'PUBLISHED';
    e.publishedAt = now();
    saveDB(db);
    return success(e);
  },

  async archiveExam(id: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const e = db.exams.find((x: any) => x.id === id);
    if (!e) return error('NOT_FOUND', 'Exam not found', 404);
    e.status = 'ARCHIVED';
    e.archivedAt = now();
    saveDB(db);
    return success(e);
  },

  async reorderQuestions(examId: string, order: { questionId: string; order: number }[]): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    db.examQuestions = (db.examQuestions || []).map((eq: any) => {
      const o = order.find((x) => x.questionId === eq.questionId);
      return o ? { ...eq, order: o.order } : eq;
    });
    saveDB(db);
    return this.getExam(examId);
  },

  async listQuestions(params: any = {}): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    let filtered = db.questions.filter((q: any) => !q.deletedAt);
    if (params.courseId) filtered = filtered.filter((q: any) => q.courseId === params.courseId);
    if (params.type) filtered = filtered.filter((q: any) => q.type === params.type);
    if (params.difficulty) filtered = filtered.filter((q: any) => q.difficulty === params.difficulty);
    if (params.status) filtered = filtered.filter((q: any) => q.status === params.status);
    if (params.createdById) filtered = filtered.filter((q: any) => q.createdById === params.createdById);
    if (params.search) {
      const term = params.search.toLowerCase();
      filtered = filtered.filter((q: any) => q.keywords.some((k: string) => k.toLowerCase().includes(term)));
    }
    const enriched = filtered.map((q: any) => {
      const course = db.courses.find((c: any) => c.id === q.courseId);
      const createdBy = db.users.find((u: any) => u.id === q.createdById);
      return {
        ...q,
        marks: Number(q.marks),
        courseName: course?.name,
        courseCode: course?.code,
        createdByName: createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : undefined,
        _count: { examQuestions: 0 },
      };
    });
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    return success(paginate(enriched, page, pageSize).items, paginate(enriched, page, pageSize).meta);
  },

  async getQuestion(id: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const q = db.questions.find((x: any) => x.id === id && !x.deletedAt);
    if (!q) return error('NOT_FOUND', 'Question not found', 404);
    const course = db.courses.find((c: any) => c.id === q.courseId);
    const createdBy = db.users.find((u: any) => u.id === q.createdById);
    const reviewedBy = q.reviewedById ? db.users.find((u: any) => u.id === q.reviewedById) : null;
    const approvedBy = q.approvedById ? db.users.find((u: any) => u.id === q.approvedById) : null;
    return success({
      ...q,
      marks: Number(q.marks),
      courseName: course?.name,
      courseCode: course?.code,
      createdByName: createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : undefined,
      reviewedByName: reviewedBy ? `${reviewedBy.firstName} ${reviewedBy.lastName}` : undefined,
      approvedByName: approvedBy ? `${approvedBy.firstName} ${approvedBy.lastName}` : undefined,
      _count: { examQuestions: 0 },
    });
  },

  async createQuestion(input: any, userId: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const course = db.courses.find((c: any) => c.id === input.courseId && !c.deletedAt);
    if (!course) return error('BAD_REQUEST', 'Course not found', 400);
    const q = {
      id: uuid(),
      courseId: input.courseId,
      type: input.type,
      difficulty: input.difficulty,
      bloomsLevel: input.bloomsLevel,
      marks: input.marks,
      content: input.content,
      keywords: input.keywords || [],
      attachments: input.attachments || null,
      status: 'DRAFT',
      rejectionReason: null,
      timesUsed: 0,
      lastUsedAt: null,
      version: 1,
      parentId: null,
      createdById: userId,
      reviewedById: null,
      approvedById: null,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };
    db.questions.push(q);
    saveDB(db);
    return success({ ...q, marks: Number(q.marks), courseName: course.name, courseCode: course.code }) as any;
  },

  async updateQuestion(id: string, input: any, userId: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const q = db.questions.find((x: any) => x.id === id && !x.deletedAt);
    if (!q) return error('NOT_FOUND', 'Question not found', 404);
    if (q.createdById !== userId) return error('FORBIDDEN', 'Only the author can edit', 403);
    if (!['DRAFT', 'REJECTED'].includes(q.status)) return error('BAD_REQUEST', `Cannot edit a ${q.status} question`, 400);
    Object.assign(q, {
      courseId: input.courseId ?? q.courseId,
      type: input.type ?? q.type,
      difficulty: input.difficulty ?? q.difficulty,
      bloomsLevel: input.bloomsLevel ?? q.bloomsLevel,
      marks: input.marks ?? q.marks,
      content: input.content ?? q.content,
      keywords: input.keywords ?? q.keywords,
      attachments: input.attachments ?? q.attachments,
      status: q.status === 'REJECTED' ? 'DRAFT' : q.status,
      rejectionReason: q.status === 'REJECTED' ? null : q.rejectionReason,
      version: input.content ? q.version + 1 : q.version,
      parentId: q.parentId ?? q.id,
      updatedAt: now(),
    });
    saveDB(db);
    return success(q);
  },

  async deleteQuestion(id: string, userId: string): Promise<void> {
    await delay();
    const db = loadDB();
    const q = db.questions.find((x: any) => x.id === id && !x.deletedAt);
    if (!q) return;
    q.deletedAt = now();
    saveDB(db);
  },

  async submitQuestionForReview(id: string, userId: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const q = db.questions.find((x: any) => x.id === id && !x.deletedAt);
    if (!q) return error('NOT_FOUND', 'Question not found', 404);
    if (q.createdById !== userId) return error('FORBIDDEN', 'Only the author can submit', 403);
    if (!['DRAFT', 'REJECTED'].includes(q.status)) return error('BAD_REQUEST', `Question is ${q.status}`, 400);
    q.status = 'PENDING_REVIEW';
    q.rejectionReason = null;
    q.updatedAt = now();
    saveDB(db);
    return success(q);
  },

  async reviewQuestion(id: string, action: any, userId: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const q = db.questions.find((x: any) => x.id === id && !x.deletedAt);
    if (!q) return error('NOT_FOUND', 'Question not found', 404);
    if (q.status !== 'PENDING_REVIEW') return error('BAD_REQUEST', `Question is ${q.status}`, 400);
    if (action.action === 'approve') q.status = 'PENDING_APPROVAL';
    else if (action.action === 'reject') {
      q.status = 'REJECTED';
      q.rejectionReason = action.reason || null;
    } else if (action.action === 'request_changes') {
      q.status = 'DRAFT';
      q.rejectionReason = action.reason || null;
    }
    q.reviewedById = userId;
    q.updatedAt = now();
    saveDB(db);
    return success(q);
  },

  async approveQuestion(id: string, userId: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const q = db.questions.find((x: any) => x.id === id && !x.deletedAt);
    if (!q) return error('NOT_FOUND', 'Question not found', 404);
    if (q.status !== 'PENDING_APPROVAL') return error('BAD_REQUEST', `Question is ${q.status}`, 400);
    q.status = 'ACTIVE';
    q.approvedById = userId;
    q.updatedAt = now();
    saveDB(db);
    return success(q);
  },

  async createUser(input: any): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    const user = {
      id: uuid(),
      email: input.email,
      passwordHash: `mock:${input.password}`,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone || null,
      avatarUrl: null,
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: now(),
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: null,
      lastLoginIp: null,
      passwordChangedAt: now(),
      mustChangePassword: false,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };
    db.users.push(user);
    if (input.roleIds) {
      db.userRoles.push(...input.roleIds.map((rid: string) => ({ userId: user.id, roleId: rid, grantedAt: now() })));
    }
    saveDB(db);
    return success(serializeUser(user, [])) as any;
  },

  // ─── Notifications ───
  async listNotifications(userId: string, params: any = {}): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.notifications) db.notifications = [];
    let filtered = db.notifications.filter((n: any) => n.userId === userId);
    if (params.unreadOnly) filtered = filtered.filter((n: any) => !n.readAt);
    filtered.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
    const page = params.page || 1;
    const pageSize = params.pageSize || 30;
    return success(paginate(filtered, page, pageSize).items, paginate(filtered, page, pageSize).meta);
  },

  async getUnreadNotificationCount(userId: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.notifications) db.notifications = [];
    const count = db.notifications.filter((n: any) => n.userId === userId && !n.readAt).length;
    return success({ count });
  },

  async markNotificationRead(id: string, userId: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.notifications) db.notifications = [];
    const n = db.notifications.find((x: any) => x.id === id);
    if (!n) return error('NOT_FOUND', 'Notification not found', 404);
    if (n.userId !== userId) return error('FORBIDDEN', 'Not your notification', 403);
    n.readAt = now();
    saveDB(db);
    return success(n);
  },

  async markAllNotificationsRead(userId: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.notifications) db.notifications = [];
    let count = 0;
    for (const n of db.notifications) {
      if (n.userId === userId && !n.readAt) {
        n.readAt = now();
        count++;
      }
    }
    saveDB(db);
    return success({ count });
  },

  async deleteNotification(id: string, userId: string): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.notifications) db.notifications = [];
    const n = db.notifications.find((x: any) => x.id === id);
    if (!n) return error('NOT_FOUND', 'Notification not found', 404);
    if (n.userId !== userId) return error('FORBIDDEN', 'Not your notification', 403);
    db.notifications = db.notifications.filter((x: any) => x.id !== id);
    saveDB(db);
    return success({ message: 'Deleted' });
  },

  // ─── Activity Log ───
  async listActivity(params: any = {}): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.activityLogs) db.activityLogs = [];
    let filtered = [...db.activityLogs];
    if (params.userId) filtered = filtered.filter((a: any) => a.userId === params.userId);
    if (params.action) filtered = filtered.filter((a: any) => a.action === params.action);
    if (params.resource) filtered = filtered.filter((a: any) => a.resource === params.resource);
    filtered.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
    const enriched = filtered.map((a: any) => {
      const user = a.userId ? db.users.find((u: any) => u.id === a.userId) : null;
      return { ...a, user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } : null };
    });
    const page = params.page || 1;
    const pageSize = params.pageSize || 30;
    return success(paginate(enriched, page, pageSize).items, paginate(enriched, page, pageSize).meta);
  },

  async getRecentActivity(limit: number): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.activityLogs) db.activityLogs = [];
    const items = [...db.activityLogs]
      .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((a: any) => {
        const user = a.userId ? db.users.find((u: any) => u.id === a.userId) : null;
        return { ...a, user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } : null };
      });
    return success(items);
  },

  async getActivityStats(): Promise<ApiResponse<any>> {
    await delay();
    const db = loadDB();
    if (!db.activityLogs) db.activityLogs = [];
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recent = db.activityLogs.filter((a: any) => a.createdAt >= since);
    const byAction: Record<string, number> = {};
    const userCounts: Record<string, number> = {};
    for (const a of recent) {
      byAction[a.action] = (byAction[a.action] || 0) + 1;
      if (a.userId) userCounts[a.userId] = (userCounts[a.userId] || 0) + 1;
    }
    const topUsers = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => {
        const user = db.users.find((u: any) => u.id === userId);
        return { userId, user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } : null, count };
      });
    return success({
      since,
      total: recent.length,
      byAction: Object.entries(byAction).map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count),
      topUsers,
    });
  },
};

function serializeUser(user: any, roles: string[]) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isActive: user.status === 'ACTIVE',
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles,
    permissions: ALL_PERMISSIONS_BY_ROLE[roles[0] as keyof typeof ALL_PERMISSIONS_BY_ROLE] || [],
  };
}

// All permissions by role (mock — real ones come from DB in production)
const ALL_PERMISSION_SLUGS = [
  'user:view', 'user:create', 'user:update', 'user:delete', 'user:manage_roles',
  'student:view', 'student:create', 'student:update', 'student:delete', 'student:import', 'student:registration:review',
  'department:view', 'department:manage',
  'course:view', 'course:manage',
  'question:view', 'question:create', 'question:update', 'question:delete', 'question:review', 'question:approve',
  'exam:create', 'exam:view', 'exam:publish',
  'result:entry', 'result:verify', 'result:approve', 'result:authorize', 'result:publish', 'result:view_own',
  'report:view', 'report:generate',
  'audit:view',
];

const ALL_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  super_admin: ALL_PERMISSION_SLUGS,
  principal: ['user:view', 'department:view', 'course:view', 'question:view', 'exam:view', 'report:view', 'audit:view', 'result:publish', 'student:view'],
  academic_dean: ['department:view', 'course:view', 'question:view', 'exam:view', 'report:view', 'result:approve', 'result:view_own', 'student:view'],
  registrar: ['student:view', 'student:create', 'student:update', 'student:import', 'student:registration:review', 'result:authorize', 'result:publish', 'report:view', 'department:view', 'course:view'],
  department_head: ['department:view', 'department:manage', 'course:view', 'question:review', 'result:verify', 'student:view', 'report:view', 'user:view'],
  teacher: ['question:view', 'question:create', 'question:update', 'result:entry', 'student:view', 'course:view', 'department:view'],
  exam_committee: ['question:view', 'question:approve', 'exam:create', 'exam:view', 'exam:publish', 'department:view', 'course:view'],
  student: ['result:view_own'],
};

// Public API to reset mock data
export function resetMockData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
  loadDB(); // re-seeds
}
