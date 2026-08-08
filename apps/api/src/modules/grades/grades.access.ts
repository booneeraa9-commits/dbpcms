import { ROLES } from "@dbpcms/shared";
import { ForbiddenError, NotFoundError } from "../../core/errors/app-error.js";
import { prisma } from "../../core/db/prisma.js";

/**
 * Determines whether a user may ENTER grades for a section.
 * Allowed: the assigned instructor(s) of the section, OR the Department Head of
 * the section's course's program's department, OR a system administrator.
 * Returns the section (with context) or throws Forbidden/NotFound.
 */
export async function assertCanEnterGrades(sectionId: string, userId: string) {
  const section = await prisma.section.findFirst({
    where: { id: sectionId, deletedAt: null },
    include: {
      course: { include: { program: { select: { departmentId: true } } } },
      instructors: { select: { instructorId: true } },
    },
  });
  if (!section) throw new NotFoundError("Section not found.");

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { roles: { include: { role: true } } },
  });
  if (!user) throw new ForbiddenError();

  const roleNames = user.roles.map((r) => r.role.name);
  const isAdmin = roleNames.includes(ROLES.SYSTEM_ADMINISTRATOR);
  const isAssignedInstructor = section.instructors.some((i) => i.instructorId === userId);

  // Dept head check: is this user the head of the section's department?
  let isDeptHead = false;
  if (roleNames.includes(ROLES.DEPARTMENT_HEAD)) {
    const deptId = section.course.program?.departmentId;
    if (deptId) {
      const dept = await prisma.department.findFirst({
        where: { id: deptId, headUserId: userId, deletedAt: null },
        select: { id: true },
      });
      isDeptHead = Boolean(dept);
    }
  }

  if (!isAdmin && !isAssignedInstructor && !isDeptHead) {
    throw new ForbiddenError("You are not allowed to enter grades for this section.");
  }
  return section;
}
