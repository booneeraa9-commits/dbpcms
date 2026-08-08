import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  SETTING_KEYS,
} from "@dbpcms/shared";
import { NotFoundError } from "../../core/errors/app-error.js";
import { prisma } from "../../core/db/prisma.js";
import { settingsService } from "../settings/settings.service.js";
import type { ReportData } from "../../core/reports/exporters.js";

function fullName(e: { firstName: string; middleName?: string | null; lastName: string }): string {
  return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ");
}
function fmt(d?: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

/**
 * Builds the DATA for each HR report (title + columns + rows). Kept separate
 * from the exporters, so the same report can be rendered on screen or exported
 * to any format.
 */
export const hrReportsService = {
  async build(reportKey: string, filters: Record<string, string>): Promise<ReportData> {
    const institution = await settingsService.get(SETTING_KEYS.INSTITUTION_NAME);
    const base = { generatedAt: new Date(), institution };

    switch (reportKey) {
      case "employee-directory":
        return { ...base, ...(await this.directory()) };
      case "department-employees":
        return { ...base, ...(await this.byDepartment(filters.department)) };
      case "qualification-summary":
        return { ...base, ...(await this.qualificationSummary()) };
      case "new-employees":
        return { ...base, ...(await this.newEmployees(filters.from, filters.to)) };
      case "contract-expiry":
        return { ...base, ...(await this.contractExpiry(filters.days)) };
      case "retirement-list":
        return { ...base, ...(await this.retirementList()) };
      case "staff-distribution":
        return { ...base, ...(await this.staffDistribution()) };
      default:
        throw new NotFoundError("Unknown report.");
    }
  },

  async directory() {
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { department: { select: { name: true } } },
    });
    return {
      title: "Employee Directory",
      columns: [
        { header: "Employee No.", key: "no", width: 16 },
        { header: "Name", key: "name", width: 24 },
        { header: "Position", key: "position", width: 20 },
        { header: "Department", key: "department", width: 20 },
        { header: "Status", key: "status", width: 14 },
        { header: "Email", key: "email", width: 24 },
        { header: "Phone", key: "phone", width: 16 },
      ],
      rows: employees.map((e) => ({
        no: e.employeeNumber,
        name: fullName(e),
        position: e.position,
        department: e.department?.name ?? "",
        status: EMPLOYMENT_STATUS_LABELS[e.employmentStatus] ?? e.employmentStatus,
        email: e.email,
        phone: e.phoneNumber,
      })),
    };
  },

  async byDepartment(departmentId?: string) {
    const where = departmentId
      ? { deletedAt: null, departmentId }
      : { deletedAt: null };
    const employees = await prisma.employee.findMany({
      where,
      orderBy: [{ departmentId: "asc" }, { lastName: "asc" }],
      include: { department: { select: { name: true } } },
    });
    return {
      title: "Department Employees",
      columns: [
        { header: "Department", key: "department", width: 22 },
        { header: "Employee No.", key: "no", width: 16 },
        { header: "Name", key: "name", width: 24 },
        { header: "Position", key: "position", width: 20 },
        { header: "Type", key: "type", width: 14 },
      ],
      rows: employees.map((e) => ({
        department: e.department?.name ?? "",
        no: e.employeeNumber,
        name: fullName(e),
        position: e.position,
        type: EMPLOYMENT_TYPE_LABELS[e.employmentType] ?? e.employmentType,
      })),
    };
  },

  async qualificationSummary() {
    const quals = await prisma.employeeQualification.groupBy({
      by: ["type"],
      _count: { _all: true },
    });
    const edu = await prisma.employeeEducation.groupBy({
      by: ["qualification"],
      _count: { _all: true },
    });
    const rows = [
      ...quals.map((q) => ({ category: `Qualification: ${q.type}`, count: q._count._all })),
      ...edu.map((e) => ({ category: `Education: ${e.qualification}`, count: e._count._all })),
    ];
    return {
      title: "Qualification Summary",
      columns: [
        { header: "Category", key: "category", width: 40 },
        { header: "Count", key: "count", width: 12 },
      ],
      rows,
    };
  },

  async newEmployees(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 864e5);
    const toDate = to ? new Date(to) : new Date();
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null, dateOfEmployment: { gte: fromDate, lte: toDate } },
      orderBy: { dateOfEmployment: "desc" },
      include: { department: { select: { name: true } } },
    });
    return {
      title: "New Employees",
      columns: [
        { header: "Employee No.", key: "no", width: 16 },
        { header: "Name", key: "name", width: 24 },
        { header: "Department", key: "department", width: 20 },
        { header: "Position", key: "position", width: 20 },
        { header: "Hired", key: "hired", width: 14 },
      ],
      rows: employees.map((e) => ({
        no: e.employeeNumber,
        name: fullName(e),
        department: e.department?.name ?? "",
        position: e.position,
        hired: fmt(e.dateOfEmployment),
      })),
    };
  },

  async contractExpiry(daysStr?: string) {
    const days =
      daysStr && Number.isFinite(Number(daysStr))
        ? Number(daysStr)
        : await settingsService.getNumber(SETTING_KEYS.CONTRACT_EXPIRY_WINDOW_DAYS, 60);
    const until = new Date(Date.now() + days * 864e5);
    const employees = await prisma.employee.findMany({
      where: {
        deletedAt: null,
        contractEndDate: { not: null, lte: until, gte: new Date() },
      },
      orderBy: { contractEndDate: "asc" },
      include: { department: { select: { name: true } } },
    });
    return {
      title: `Contract Expiry (next ${days} days)`,
      columns: [
        { header: "Employee No.", key: "no", width: 16 },
        { header: "Name", key: "name", width: 24 },
        { header: "Department", key: "department", width: 20 },
        { header: "Contract ends", key: "ends", width: 16 },
      ],
      rows: employees.map((e) => ({
        no: e.employeeNumber,
        name: fullName(e),
        department: e.department?.name ?? "",
        ends: fmt(e.contractEndDate),
      })),
    };
  },

  async retirementList() {
    const retirementAge = await settingsService.getNumber(SETTING_KEYS.RETIREMENT_AGE, 60);
    // Anyone whose date of birth is on/before this cutoff has reached the age.
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - retirementAge);
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null, dateOfBirth: { lte: cutoff } },
      orderBy: { dateOfBirth: "asc" },
      include: { department: { select: { name: true } } },
    });
    const now = new Date();
    return {
      title: `Retirement List (age ${retirementAge}+)`,
      columns: [
        { header: "Employee No.", key: "no", width: 16 },
        { header: "Name", key: "name", width: 24 },
        { header: "Department", key: "department", width: 20 },
        { header: "Date of birth", key: "dob", width: 16 },
        { header: "Age", key: "age", width: 8 },
      ],
      rows: employees.map((e) => {
        const dob = new Date(e.dateOfBirth);
        let age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
        return {
          no: e.employeeNumber,
          name: fullName(e),
          department: e.department?.name ?? "",
          dob: fmt(e.dateOfBirth),
          age,
        };
      }),
    };
  },

  async staffDistribution() {
    const byDept = await prisma.employee.groupBy({
      by: ["departmentId"],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const departments = await prisma.department.findMany({
      where: { id: { in: byDept.map((d) => d.departmentId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(departments.map((d) => [d.id, d.name]));

    const byType = await prisma.employee.groupBy({
      by: ["employmentType"],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const byStatus = await prisma.employee.groupBy({
      by: ["employmentStatus"],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const rows = [
      ...byDept.map((d) => ({
        dimension: "Department",
        value: nameById.get(d.departmentId) ?? "(unknown)",
        count: d._count._all,
      })),
      ...byType.map((t) => ({
        dimension: "Employment type",
        value: EMPLOYMENT_TYPE_LABELS[t.employmentType] ?? t.employmentType,
        count: t._count._all,
      })),
      ...byStatus.map((s) => ({
        dimension: "Status",
        value: EMPLOYMENT_STATUS_LABELS[s.employmentStatus] ?? s.employmentStatus,
        count: s._count._all,
      })),
    ];
    return {
      title: "Staff Distribution",
      columns: [
        { header: "Dimension", key: "dimension", width: 20 },
        { header: "Value", key: "value", width: 28 },
        { header: "Count", key: "count", width: 12 },
      ],
      rows,
    };
  },
};
