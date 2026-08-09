import { prisma } from "../../core/db/prisma.js";

interface SearchResult {
  type: "employee" | "student" | "course" | "department";
  id: string;
  title: string;
  subtitle: string;
}

/**
 * Global search across core entities. Results are PERMISSION-FILTERED: a user
 * only searches entity types they're allowed to read. Each type is capped so
 * one big query stays fast.
 */
export const searchService = {
  async search(query: string, perms: Set<string>): Promise<SearchResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const like = { contains: q, mode: "insensitive" as const };
    const results: SearchResult[] = [];

    if (perms.has("employee:read")) {
      const rows = await prisma.employee.findMany({
        where: { deletedAt: null, OR: [
          { firstName: like }, { lastName: like }, { employeeNumber: like }, { email: like }, { position: like },
        ] },
        take: 5,
        include: { department: { select: { name: true } } },
      });
      for (const e of rows) results.push({
        type: "employee", id: e.id,
        title: `${e.firstName} ${e.lastName}`,
        subtitle: `${e.employeeNumber} · ${e.position}${e.department ? " · " + e.department.name : ""}`,
      });
    }

    if (perms.has("student:read")) {
      const rows = await prisma.student.findMany({
        where: { deletedAt: null, OR: [
          { firstName: like }, { lastName: like }, { studentNumber: like },
        ] },
        take: 5,
        include: { program: { select: { name: true } } },
      });
      for (const s of rows) results.push({
        type: "student", id: s.id,
        title: `${s.firstName} ${s.lastName}`,
        subtitle: `${s.studentNumber}${s.program ? " · " + s.program.name : ""}`,
      });
    }

    if (perms.has("course:manage")) {
      const rows = await prisma.course.findMany({
        where: { deletedAt: null, OR: [{ code: like }, { title: like }] },
        take: 5,
      });
      for (const c of rows) results.push({
        type: "course", id: c.id, title: `${c.code} — ${c.title}`, subtitle: `${c.creditHours} credits`,
      });
    }

    if (perms.has("department:read")) {
      const rows = await prisma.department.findMany({
        where: { deletedAt: null, OR: [{ name: like }, { code: like }] },
        take: 5,
      });
      for (const d of rows) results.push({
        type: "department", id: d.id, title: d.name, subtitle: `Code: ${d.code}`,
      });
    }

    return results;
  },
};
