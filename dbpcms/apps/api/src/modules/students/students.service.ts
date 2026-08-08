/**
 * Students service.
 *
 * Key principle: A student has ONE permanent profile.
 * Yearly enrollment is stored separately in student_registrations.
 * This means a student can be re-registered each year without losing history.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../infra/database/client';
import { NotFoundError, BadRequestError } from '../../common/errors/AppError';
import { normalizePagination, buildMeta } from '../../common/utils/pagination';
import { generateStudentIdNumber } from '../../common/utils/idGenerator';
import { generateQrCodeDataUrl } from '../../common/utils/qrcode';
import { activityLog } from '../activity/activity.service';
import type { Request } from 'express';
import type { PaginatedResponse } from '@dbpcms/shared';
import type {
  CreateStudentInput,
  UpdateStudentInput,
  ListStudentsQuery,
  CreateRegistrationInput,
} from './students.schema';

export interface StudentDTO {
  id: string;
  studentIdNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: string;
  birthDate: string;
  age: number;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  photoUrl: string | null;
  qrCodeUrl: string | null;

  guardianName: string | null;
  guardianPhone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;

  previousSchool: string | null;
  previousGrade: string | null;

  programId: string;
  programName?: string;
  programCode?: string;
  departmentName?: string;
  admissionDate: string;
  status: string;
  statusUpdatedAt: string | null;

  createdAt: string;
  updatedAt: string;
  _count?: { registrations: number; results: number };
  currentRegistration?: {
    academicYearId: string;
    academicYearName: string;
    level: number;
    section: string | null;
  } | null;
}

class StudentsService {
  // ─── LIST ─────────────────────────────────────────
  async list(req: Request, query: ListStudentsQuery): Promise<PaginatedResponse<StudentDTO>> {
    const pagination = normalizePagination(query);

    const where: Prisma.StudentWhereInput = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.programId) where.programId = query.programId;
    if (query.gender) where.gender = query.gender;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { middleName: { contains: query.search, mode: 'insensitive' } },
        { studentIdNumber: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { nationalId: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.academicYearId) {
      where.registrations = { some: { academicYearId: query.academicYearId } };
    }
    if (query.level) {
      where.registrations = { some: { level: query.level, isActive: true } };
    }

    const orderBy: Prisma.StudentOrderByWithRelationInput = query.sortBy
      ? { [query.sortBy]: query.sortOrder ?? 'asc' }
      : { createdAt: 'desc' };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
        include: {
          program: { include: { department: true } },
          registrations: {
            orderBy: { registeredAt: 'desc' },
            take: 1,
            include: { academicYear: true },
          },
          _count: { select: { registrations: true, results: true } },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return {
      items: students.map((s) => this.serialize(s)),
      meta: buildMeta(total, pagination.page, pagination.pageSize),
    };
  }

  // ─── GET BY ID ────────────────────────────────────
  async getById(id: string): Promise<StudentDTO> {
    const student = await prisma.student.findFirst({
      where: { id, deletedAt: null },
      include: {
        program: { include: { department: true } },
        registrations: {
          orderBy: { registeredAt: 'desc' },
          include: { academicYear: true },
        },
        _count: { select: { registrations: true, results: true } },
      },
    });
    if (!student) throw new NotFoundError('Student');
    return this.serialize(student);
  }

  // ─── CREATE ───────────────────────────────────────
  async create(req: Request, input: CreateStudentInput, createdBy: string): Promise<StudentDTO> {
    // Verify program exists
    const program = await prisma.program.findFirst({
      where: { id: input.programId, deletedAt: null },
    });
    if (!program) throw new BadRequestError('Program not found');

    // Verify initial level is in the program's level range
    const programLevels = await prisma.programLevel.findMany({
      where: { programId: input.programId },
    });
    if (programLevels.length > 0 && !programLevels.some((pl) => pl.level === input.initialLevel)) {
      throw new BadRequestError(
        `This program doesn't include level ${input.initialLevel}. Allowed: ${programLevels.map((p) => p.level).join(', ')}`,
      );
    }

    const admissionYear = new Date(input.admissionDate).getFullYear();
    const studentIdNumber = await generateStudentIdNumber(admissionYear);

    // Generate QR code
    const qrCodeUrl = await generateQrCodeDataUrl({ data: studentIdNumber, size: 300 });

    const student = await prisma.student.create({
      data: {
        studentIdNumber,
        firstName: input.firstName,
        middleName: input.middleName || null,
        lastName: input.lastName,
        gender: input.gender,
        birthDate: new Date(input.birthDate),
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
        programId: input.programId,
        admissionDate: new Date(input.admissionDate),
        status: 'ACTIVE',
        qrCodeUrl,
      },
      include: {
        program: { include: { department: true } },
        registrations: { include: { academicYear: true } },
        _count: { select: { registrations: true, results: true } },
      },
    });

    // Auto-create initial registration for current academic year if available
    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
    if (currentYear) {
      await prisma.studentRegistration.create({
        data: {
          studentId: student.id,
          academicYearId: currentYear.id,
          level: input.initialLevel,
          registeredBy: createdBy,
        },
      });
    }

    await activityLog.log(req, {
      userId: createdBy,
      action: 'CREATE',
      resource: 'student',
      resourceId: student.id,
      description: `Created student ${student.studentIdNumber} (${student.firstName} ${student.lastName})`,
    });

    return this.serialize(student);
  }

  // ─── UPDATE ───────────────────────────────────────
  async update(req: Request, id: string, input: UpdateStudentInput, updatedBy: string): Promise<StudentDTO> {
    const student = await prisma.student.findFirst({ where: { id, deletedAt: null } });
    if (!student) throw new NotFoundError('Student');

    if (input.programId && input.programId !== student.programId) {
      const program = await prisma.program.findFirst({ where: { id: input.programId, deletedAt: null } });
      if (!program) throw new BadRequestError('Program not found');
    }

    const { initialLevel: _ignore, ...updateFields } = input;
    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...updateFields,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        admissionDate: input.admissionDate ? new Date(input.admissionDate) : undefined,
        statusUpdatedAt: input.status ? new Date() : undefined,
      },
      include: {
        program: { include: { department: true } },
        registrations: { include: { academicYear: true }, orderBy: { registeredAt: 'desc' } },
        _count: { select: { registrations: true, results: true } },
      },
    });

    await activityLog.log(req, {
      userId: updatedBy,
      action: 'UPDATE',
      resource: 'student',
      resourceId: id,
      description: `Updated student ${updated.studentIdNumber}`,
    });

    return this.serialize(updated);
  }

  // ─── SOFT DELETE ──────────────────────────────────
  async softDelete(req: Request, id: string, deletedBy: string): Promise<void> {
    const student = await prisma.student.findFirst({ where: { id, deletedAt: null } });
    if (!student) throw new NotFoundError('Student');
    await prisma.student.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'WITHDRAWN', statusUpdatedAt: new Date() },
    });
    await activityLog.log(req, {
      userId: deletedBy,
      action: 'DELETE',
      resource: 'student',
      resourceId: id,
      description: `Deleted student ${student.studentIdNumber}`,
    });
  }

  // ─── YEARLY REGISTRATION ──────────────────────────
  async createRegistration(req: Request, input: CreateRegistrationInput, createdBy: string): Promise<unknown> {
    const student = await prisma.student.findFirst({ where: { id: input.studentId, deletedAt: null } });
    if (!student) throw new NotFoundError('Student');

    const year = await prisma.academicYear.findUnique({ where: { id: input.academicYearId } });
    if (!year) throw new BadRequestError('Academic year not found');

    // Verify the student can be in this level (within program's range)
    const programLevels = await prisma.programLevel.findMany({
      where: { programId: student.programId },
    });
    if (programLevels.length > 0 && !programLevels.some((pl) => pl.level === input.level)) {
      throw new BadRequestError(`Program doesn't include level ${input.level}`);
    }

    const registration = await prisma.studentRegistration.upsert({
      where: {
        studentId_academicYearId: {
          studentId: input.studentId,
          academicYearId: input.academicYearId,
        },
      },
      update: {
        level: input.level,
        section: input.section || null,
        rollNumber: input.rollNumber || null,
        isActive: true,
      },
      create: {
        studentId: input.studentId,
        academicYearId: input.academicYearId,
        level: input.level,
        section: input.section || null,
        rollNumber: input.rollNumber || null,
        registeredBy: createdBy,
      },
    });

    await activityLog.log(req, {
      userId: createdBy,
      action: 'CREATE',
      resource: 'student_registration',
      resourceId: registration.id,
      description: `Registered ${student.studentIdNumber} for level ${input.level}`,
    });

    return registration;
  }

  // ─── BULK IMPORT ──────────────────────────────────
  async bulkImport(req: Request, students: CreateStudentInput[], createdBy: string): Promise<{
    created: number;
    failed: { row: number; reason: string; data: unknown }[];
    students: StudentDTO[];
  }> {
    const created: StudentDTO[] = [];
    const failed: { row: number; reason: string; data: unknown }[] = [];

    for (let i = 0; i < students.length; i++) {
      try {
        const student = await this.create(req, students[i], createdBy);
        created.push(student);
      } catch (err) {
        failed.push({
          row: i + 2, // +2 for 1-indexed + header row
          reason: err instanceof Error ? err.message : 'Unknown error',
          data: students[i],
        });
      }
    }

    await activityLog.log(req, {
      userId: createdBy,
      action: 'IMPORT',
      resource: 'student',
      description: `Bulk import: ${created.length} created, ${failed.length} failed`,
    });

    return { created: created.length, failed, students: created };
  }

  // ─── HELPERS ──────────────────────────────────────
  private serialize(s: any): StudentDTO {
    const today = new Date();
    const birth = new Date(s.birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

    const currentReg = s.registrations?.[0];

    return {
      id: s.id,
      studentIdNumber: s.studentIdNumber,
      firstName: s.firstName,
      middleName: s.middleName,
      lastName: s.lastName,
      gender: s.gender,
      birthDate: s.birthDate.toISOString(),
      age,
      nationalId: s.nationalId,
      phone: s.phone,
      email: s.email,
      address: s.address,
      photoUrl: s.photoUrl,
      qrCodeUrl: s.qrCodeUrl,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      emergencyContactName: s.emergencyContactName,
      emergencyContactPhone: s.emergencyContactPhone,
      previousSchool: s.previousSchool,
      previousGrade: s.previousGrade,
      programId: s.programId,
      programName: s.program?.name,
      programCode: s.program?.code,
      departmentName: s.program?.department?.name,
      admissionDate: s.admissionDate.toISOString(),
      status: s.status,
      statusUpdatedAt: s.statusUpdatedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      _count: s._count,
      currentRegistration: currentReg ? {
        academicYearId: currentReg.academicYearId,
        academicYearName: currentReg.academicYear?.name ?? '',
        level: currentReg.level,
        section: currentReg.section,
      } : null,
    };
  }
}

export const studentsService = new StudentsService();
