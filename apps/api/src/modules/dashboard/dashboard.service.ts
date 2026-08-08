import { ROLES } from "@dbpcms/shared";
import { prisma } from "../../core/db/prisma.js";

/**
 * Builds a role-appropriate dashboard summary. It returns only the widgets the
 * user's permissions justify, so each role gets a tailored view without leaking
 * data they shouldn't see.
 */
async function permissionsFor(userId: string): Promise<{ perms: Set<string>; roles: string[] }> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  const perms = new Set<string>();
  const roles: string[] = [];
  if (user) {
    for (const ur of user.roles) {
      roles.push(ur.role.name);
      for (const rp of ur.role.permissions) perms.add(rp.permission.key);
    }
  }
  return { perms, roles };
}

export const dashboardService = {
  async summary(userId: string) {
    const { perms, roles } = await permissionsFor(userId);
    const has = (p: string): boolean => perms.has(p);

    const result: Record<string, unknown> = { roles };

    // --- Count cards (permission-gated) ---
    const counts: Record<string, number> = {};
    const countJobs: Promise<void>[] = [];
    if (has("user:read")) countJobs.push(prisma.user.count({ where: { deletedAt: null } }).then((n) => { counts.users = n; }));
    if (has("employee:read")) countJobs.push(prisma.employee.count({ where: { deletedAt: null } }).then((n) => { counts.employees = n; }));
    if (has("student:read")) countJobs.push(prisma.student.count({ where: { deletedAt: null } }).then((n) => { counts.students = n; }));
    if (has("department:read")) countJobs.push(prisma.department.count({ where: { deletedAt: null } }).then((n) => { counts.departments = n; }));
    if (has("course:manage")) countJobs.push(prisma.course.count({ where: { deletedAt: null } }).then((n) => { counts.courses = n; }));
    if (has("section:manage")) countJobs.push(prisma.section.count({ where: { deletedAt: null } }).then((n) => { counts.sections = n; }));
    await Promise.all(countJobs);
    result.counts = counts;

    // --- Employees by department (HR/admin/dean) ---
    if (has("employee:read")) {
      const grouped = await prisma.employee.groupBy({ by: ["departmentId"], where: { deletedAt: null }, _count: { _all: true } });
      const depts = await prisma.department.findMany({ where: { id: { in: grouped.map((g) => g.departmentId) } }, select: { id: true, name: true } });
      const nameById = new Map(depts.map((d) => [d.id, d.name]));
      result.employeesByDepartment = grouped.map((g) => ({ label: nameById.get(g.departmentId) ?? "—", value: g._count._all }));

      // HR extras: new employees this month + contracts expiring soon.
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const in60 = new Date(Date.now() + 60 * 864e5);
      const [newThisMonth, contractsExpiring] = await Promise.all([
        prisma.employee.count({ where: { deletedAt: null, dateOfEmployment: { gte: monthStart } } }),
        prisma.employee.count({ where: { deletedAt: null, contractEndDate: { not: null, gte: new Date(), lte: in60 } } }),
      ]);
      result.hr = { newThisMonth, contractsExpiring };
    }

    // --- Students by status (registrar/dean/admin) ---
    if (has("student:read")) {
      const grouped = await prisma.student.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } });
      result.studentsByStatus = grouped.map((g) => ({ label: g.status, value: g._count._all }));
    }

    // --- Grade submission pipeline (registrar/dept head/admin) ---
    if (has("grade:approve") || has("grade:publish") || has("section:manage")) {
      const grouped = await prisma.gradeSubmission.groupBy({ by: ["status"], _count: { _all: true } });
      const byStatus: Record<string, number> = {};
      for (const g of grouped) byStatus[g.status] = g._count._all;
      result.gradePipeline = {
        draft: byStatus.draft ?? 0,
        submitted: byStatus.submitted ?? 0,
        dept_approved: byStatus.dept_approved ?? 0,
        published: byStatus.published ?? 0,
        returned: byStatus.returned ?? 0,
      };
    }

    // --- Instructor view: my sections + pending entry ---
    if (roles.includes(ROLES.INSTRUCTOR)) {
      const assignments = await prisma.instructorAssignment.findMany({
        where: { instructorId: userId },
        include: {
          section: {
            include: {
              course: { select: { code: true, title: true } },
              semester: { select: { name: true } },
              gradeSubmission: { select: { status: true } },
              _count: { select: { enrollments: true } },
            },
          },
        },
      });
      result.mySections = assignments.map((a) => ({
        sectionId: a.section.id,
        course: `${a.section.course.code} — ${a.section.course.title}`,
        semester: a.section.semester.name,
        enrolled: a.section._count.enrollments,
        status: a.section.gradeSubmission?.status ?? "draft",
      }));
    }

    // --- Recent activity feed (from the audit log) ---
    if (has("audit-log:read")) {
      const logs = await prisma.auditLog.findMany({
        take: 8, orderBy: { createdAt: "desc" },
        include: { user: { select: { fullName: true } } },
      });
      result.recentActivity = logs.map((l) => ({
        action: l.action,
        who: l.user?.fullName ?? "System",
        entityType: l.entityType,
        at: l.createdAt,
      }));
    }

    return result;
  },
};
