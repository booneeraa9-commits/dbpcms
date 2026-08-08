import { calculateGpa } from "@dbpcms/shared";
import { NotFoundError } from "../../core/errors/app-error.js";
import { prisma } from "../../core/db/prisma.js";

/**
 * Builds a student's academic transcript from PUBLISHED grade results. Results
 * carry a frozen snapshot, so the transcript is historically accurate even if
 * grading policy changes later. Grouped by semester with semester + cumulative GPA.
 */
export const transcriptsService = {
  async build(studentId: string) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, deletedAt: null },
      include: {
        department: { select: { name: true } },
        program: { select: { name: true, degreeLevel: true } },
      },
    });
    if (!student) throw new NotFoundError("Student not found.");

    // All enrollments for this student that have a PUBLISHED result.
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        deletedAt: null,
        gradeResult: { is: { publishedAt: { not: null } } },
      },
      include: {
        gradeResult: true,
        section: {
          include: {
            course: { select: { code: true, title: true, creditHours: true } },
            semester: { select: { id: true, name: true, sequence: true, academicYear: { select: { name: true } } } },
          },
        },
      },
    });

    // Group by semester.
    const bySemester = new Map<string, {
      semesterName: string;
      academicYear: string;
      sequence: number;
      rows: { code: string; title: string; creditHours: number; letter: string | null; gradePoint: number | null; isPass: boolean | null; percentage: number | null }[];
    }>();

    for (const e of enrollments) {
      const sem = e.section.semester;
      const key = sem.id;
      if (!bySemester.has(key)) {
        bySemester.set(key, {
          semesterName: sem.name,
          academicYear: sem.academicYear?.name ?? "",
          sequence: sem.sequence,
          rows: [],
        });
      }
      bySemester.get(key)!.rows.push({
        code: e.section.course.code,
        title: e.section.course.title,
        creditHours: e.section.course.creditHours,
        letter: e.gradeResult?.letter ?? null,
        gradePoint: e.gradeResult?.gradePoint ?? null,
        isPass: e.gradeResult?.isPass ?? null,
        percentage: e.gradeResult?.percentage ?? null,
      });
    }

    // Build ordered semester blocks with semester GPA + running cumulative.
    const orderedKeys = [...bySemester.entries()].sort((a, b) => {
      const ay = a[1].academicYear.localeCompare(b[1].academicYear);
      return ay !== 0 ? ay : a[1].sequence - b[1].sequence;
    });

    const semesters: {
      semesterName: string;
      academicYear: string;
      rows: typeof bySemester extends Map<string, infer V> ? (V extends { rows: infer R } ? R : never) : never;
      semesterGpa: number;
      semesterCredits: number;
    }[] = [];

    let cumPoints = 0;
    let cumCredits = 0;
    let cumEarned = 0;

    for (const [, block] of orderedKeys) {
      const graded = block.rows.filter((r) => r.gradePoint !== null);
      const semesterGpa = calculateGpa(
        graded.map((r) => ({ gradePoint: r.gradePoint as number, creditHours: r.creditHours })),
      );
      const semesterCredits = graded.reduce((s, r) => s + r.creditHours, 0);
      for (const r of graded) {
        cumPoints += (r.gradePoint as number) * r.creditHours;
        cumCredits += r.creditHours;
        if (r.isPass) cumEarned += r.creditHours;
      }
      semesters.push({
        semesterName: block.semesterName,
        academicYear: block.academicYear,
        rows: block.rows as never,
        semesterGpa,
        semesterCredits,
      });
    }

    const cumulativeGpa = cumCredits > 0 ? Math.round((cumPoints / cumCredits) * 100) / 100 : 0;

    return {
      student: {
        id: student.id,
        studentNumber: student.studentNumber,
        name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" "),
        department: student.department?.name ?? "",
        program: student.program?.name ?? "",
        degreeLevel: student.program?.degreeLevel ?? "",
        status: student.status,
      },
      semesters,
      cumulativeGpa,
      creditsAttempted: cumCredits,
      creditsEarned: cumEarned,
      hasResults: enrollments.length > 0,
    };
  },
};
