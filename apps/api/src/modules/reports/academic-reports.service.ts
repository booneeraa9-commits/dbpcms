import { calculateGpa, SETTING_KEYS } from "@dbpcms/shared";
import { NotFoundError } from "../../core/errors/app-error.js";
import { prisma } from "../../core/db/prisma.js";
import { settingsService } from "../settings/settings.service.js";
import type { ReportData } from "../../core/reports/exporters.js";

/**
 * Academic analytics reports built from PUBLISHED grade results. Reuses the
 * same ReportData shape so they export to PDF/Excel/CSV via the shared engine.
 */
export const academicReportsService = {
  async build(reportKey: string): Promise<ReportData> {
    const institution = await settingsService.get(SETTING_KEYS.INSTITUTION_NAME);
    const base = { generatedAt: new Date(), institution };
    switch (reportKey) {
      case "pass-rate":
        return { ...base, ...(await this.passRate()) };
      case "top-students":
        return { ...base, ...(await this.topStudents()) };
      case "department-gpa":
        return { ...base, ...(await this.departmentGpa()) };
      case "failure-analysis":
        return { ...base, ...(await this.failureAnalysis()) };
      default:
        throw new NotFoundError("Unknown report.");
    }
  },

  /** Loads published results joined to student's department. */
  async publishedResults() {
    return prisma.gradeResult.findMany({
      where: { publishedAt: { not: null } },
      include: {
        enrollment: {
          include: {
            student: { include: { department: { select: { id: true, name: true } } } },
            section: { include: { course: { select: { code: true, title: true, creditHours: true } } } },
          },
        },
      },
    });
  },

  async passRate() {
    const results = await this.publishedResults();
    const byDept = new Map<string, { name: string; pass: number; total: number }>();
    for (const r of results) {
      const dept = r.enrollment.student.department;
      const key = dept?.id ?? "none";
      if (!byDept.has(key)) byDept.set(key, { name: dept?.name ?? "—", pass: 0, total: 0 });
      const rec = byDept.get(key)!;
      rec.total += 1;
      if (r.isPass) rec.pass += 1;
    }
    return {
      title: "Pass Rate by Department",
      columns: [
        { header: "Department", key: "dept", width: 28 },
        { header: "Passed", key: "pass", width: 12 },
        { header: "Total", key: "total", width: 12 },
        { header: "Pass rate", key: "rate", width: 14 },
      ],
      rows: [...byDept.values()].map((d) => ({
        dept: d.name, pass: d.pass, total: d.total,
        rate: d.total ? `${Math.round((d.pass / d.total) * 100)}%` : "—",
      })),
    };
  },

  async topStudents() {
    const results = await this.publishedResults();
    const byStudent = new Map<string, { name: string; number: string; points: number; credits: number }>();
    for (const r of results) {
      if (r.gradePoint === null) continue;
      const s = r.enrollment.student;
      const key = s.id;
      if (!byStudent.has(key)) byStudent.set(key, { name: `${s.firstName} ${s.lastName}`, number: s.studentNumber, points: 0, credits: 0 });
      const rec = byStudent.get(key)!;
      const credits = r.enrollment.section.course.creditHours;
      rec.points += r.gradePoint * credits;
      rec.credits += credits;
    }
    const ranked = [...byStudent.values()]
      .map((s) => ({ ...s, gpa: s.credits ? Math.round((s.points / s.credits) * 100) / 100 : 0 }))
      .sort((a, b) => b.gpa - a.gpa)
      .slice(0, 25);
    return {
      title: "Top Students by GPA",
      columns: [
        { header: "Rank", key: "rank", width: 8 },
        { header: "Student No.", key: "number", width: 16 },
        { header: "Name", key: "name", width: 26 },
        { header: "GPA", key: "gpa", width: 10 },
      ],
      rows: ranked.map((s, i) => ({ rank: i + 1, number: s.number, name: s.name, gpa: s.gpa })),
    };
  },

  async departmentGpa() {
    const results = await this.publishedResults();
    const byDept = new Map<string, { name: string; points: number; credits: number }>();
    for (const r of results) {
      if (r.gradePoint === null) continue;
      const dept = r.enrollment.student.department;
      const key = dept?.id ?? "none";
      if (!byDept.has(key)) byDept.set(key, { name: dept?.name ?? "—", points: 0, credits: 0 });
      const rec = byDept.get(key)!;
      const credits = r.enrollment.section.course.creditHours;
      rec.points += r.gradePoint * credits;
      rec.credits += credits;
    }
    return {
      title: "Average GPA by Department",
      columns: [
        { header: "Department", key: "dept", width: 28 },
        { header: "Average GPA", key: "gpa", width: 14 },
        { header: "Graded credits", key: "credits", width: 16 },
      ],
      rows: [...byDept.values()].map((d) => ({
        dept: d.name,
        gpa: d.credits ? Math.round((d.points / d.credits) * 100) / 100 : 0,
        credits: d.credits,
      })),
    };
  },

  async failureAnalysis() {
    const results = await this.publishedResults();
    const byCourse = new Map<string, { code: string; title: string; fail: number; total: number }>();
    for (const r of results) {
      const c = r.enrollment.section.course;
      const key = c.code;
      if (!byCourse.has(key)) byCourse.set(key, { code: c.code, title: c.title, fail: 0, total: 0 });
      const rec = byCourse.get(key)!;
      rec.total += 1;
      if (r.isPass === false) rec.fail += 1;
    }
    return {
      title: "Failure Analysis by Course",
      columns: [
        { header: "Course", key: "code", width: 14 },
        { header: "Title", key: "title", width: 30 },
        { header: "Failed", key: "fail", width: 10 },
        { header: "Total", key: "total", width: 10 },
        { header: "Failure rate", key: "rate", width: 14 },
      ],
      rows: [...byCourse.values()]
        .filter((c) => c.total > 0)
        .sort((a, b) => (b.fail / b.total) - (a.fail / a.total))
        .map((c) => ({ code: c.code, title: c.title, fail: c.fail, total: c.total, rate: `${Math.round((c.fail / c.total) * 100)}%` })),
    };
  },
};
