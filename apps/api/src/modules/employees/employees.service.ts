import { employeeCreateSchema, employeeUpdateSchema } from "@dbpcms/shared";
import { ConflictError, NotFoundError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { parseListQuery } from "../../core/http/query.js";
import { prisma } from "../../core/db/prisma.js";
import { employeesRepository } from "./employees.repository.js";
import { nextEmployeeNumber } from "./employee-number.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Turns empty-string optionals into null / proper types for the database. */
function toDate(value?: string): Date | null {
  return value ? new Date(value) : null;
}
function emptyToNull(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}

export const employeesService = {
  async list(rawQuery: Record<string, unknown>) {
    const q = parseListQuery(
      rawQuery,
      ["lastName", "firstName", "employeeNumber", "createdAt"],
      { createdAt: "desc" },
    );
    const departmentId =
      typeof rawQuery.department === "string" ? rawQuery.department : undefined;
    const employmentStatus =
      typeof rawQuery.status === "string" ? rawQuery.status : undefined;

    const { items, total } = await employeesRepository.list({
      skip: q.skip,
      take: q.take,
      search: q.search,
      departmentId,
      employmentStatus,
      orderBy: q.orderBy,
    });
    return { items, total, page: q.page, pageSize: q.pageSize };
  },

  async getById(id: string) {
    const employee = await employeesRepository.findById(id);
    if (!employee) throw new NotFoundError("Employee not found.");
    return employee;
  },

  async create(rawInput: unknown, actor: ActorMeta) {
    const input = employeeCreateSchema.parse(rawInput);

    // Department must exist.
    const dept = await prisma.department.findFirst({
      where: { id: input.departmentId, deletedAt: null },
    });
    if (!dept) throw new NotFoundError("Selected department does not exist.");

    // National ID must be unique among active employees.
    const clash = await employeesRepository.findByNationalId(input.nationalId);
    if (clash) {
      throw new ConflictError("An employee with that National ID already exists.");
    }

    // Optional supervisor must exist.
    if (input.supervisorId) {
      const sup = await prisma.employee.findFirst({
        where: { id: input.supervisorId, deletedAt: null },
      });
      if (!sup) throw new NotFoundError("Selected supervisor does not exist.");
    }

    // Create inside a transaction so the employee number is allocated safely.
    const created = await prisma.$transaction(async (tx) => {
      const employeeNumber = await nextEmployeeNumber(tx);
      return tx.employee.create({
        data: {
          employeeNumber,
          firstName: input.firstName,
          middleName: emptyToNull(input.middleName),
          lastName: input.lastName,
          gender: input.gender,
          dateOfBirth: new Date(input.dateOfBirth),
          nationality: emptyToNull(input.nationality),
          maritalStatus: emptyToNull(input.maritalStatus),
          nationalId: input.nationalId,
          taxId: emptyToNull(input.taxId),
          phoneNumber: input.phoneNumber,
          email: input.email,
          address: emptyToNull(input.address),
          departmentId: input.departmentId,
          position: input.position,
          employmentType: input.employmentType,
          contractType: emptyToNull(input.contractType),
          employmentStatus: input.employmentStatus,
          dateOfEmployment: new Date(input.dateOfEmployment),
          contractEndDate: toDate(input.contractEndDate),
          salaryGrade: emptyToNull(input.salaryGrade),
          officeLocation: emptyToNull(input.officeLocation),
          supervisorId: input.supervisorId || null,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
      });
    });

    await writeAudit({
      userId: actor.userId,
      action: "employee.create",
      entityType: "Employee",
      entityId: created.id,
      after: { employeeNumber: created.employeeNumber, name: `${created.firstName} ${created.lastName}` },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return this.getById(created.id);
  },

  async update(id: string, rawInput: unknown, actor: ActorMeta) {
    const input = employeeUpdateSchema.parse(rawInput);
    const before = await employeesRepository.findById(id);
    if (!before) throw new NotFoundError("Employee not found.");

    if (input.departmentId && input.departmentId !== before.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: input.departmentId, deletedAt: null },
      });
      if (!dept) throw new NotFoundError("Selected department does not exist.");
    }
    if (input.nationalId && input.nationalId !== before.nationalId) {
      const clash = await employeesRepository.findByNationalId(input.nationalId);
      if (clash) {
        throw new ConflictError("An employee with that National ID already exists.");
      }
    }
    if (input.supervisorId) {
      if (input.supervisorId === id) {
        throw new ConflictError("An employee cannot be their own supervisor.");
      }
      const sup = await prisma.employee.findFirst({
        where: { id: input.supervisorId, deletedAt: null },
      });
      if (!sup) throw new NotFoundError("Selected supervisor does not exist.");
    }

    const data: Record<string, unknown> = { updatedBy: actor.userId, version: { increment: 1 } };
    const setIf = (key: keyof typeof input, transform?: (v: string) => unknown) => {
      const value = input[key];
      if (value !== undefined) data[key] = transform ? transform(value as string) : value;
    };
    setIf("firstName");
    setIf("middleName", emptyToNull);
    setIf("lastName");
    setIf("gender");
    setIf("dateOfBirth", (v) => new Date(v));
    setIf("nationality", emptyToNull);
    setIf("maritalStatus", emptyToNull);
    setIf("nationalId");
    setIf("taxId", emptyToNull);
    setIf("phoneNumber");
    setIf("email");
    setIf("address", emptyToNull);
    setIf("departmentId");
    setIf("position");
    setIf("employmentType");
    setIf("contractType", emptyToNull);
    setIf("employmentStatus");
    setIf("dateOfEmployment", (v) => new Date(v));
    setIf("contractEndDate", (v) => toDate(v));
    setIf("salaryGrade", emptyToNull);
    setIf("officeLocation", emptyToNull);
    if (input.supervisorId !== undefined) data.supervisorId = input.supervisorId || null;

    await employeesRepository.update(id, data);
    await writeAudit({
      userId: actor.userId,
      action: "employee.update",
      entityType: "Employee",
      entityId: id,
      before: { name: `${before.firstName} ${before.lastName}`, status: before.employmentStatus },
      after: { status: input.employmentStatus },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return this.getById(id);
  },

  async remove(id: string, actor: ActorMeta) {
    const before = await employeesRepository.findById(id);
    if (!before) throw new NotFoundError("Employee not found.");
    await employeesRepository.softDelete(id, actor.userId);
    await writeAudit({
      userId: actor.userId,
      action: "employee.delete",
      entityType: "Employee",
      entityId: id,
      before: { employeeNumber: before.employeeNumber },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  },
};
