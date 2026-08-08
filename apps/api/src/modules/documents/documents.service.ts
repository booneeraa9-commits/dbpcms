import crypto from "node:crypto";
import { z } from "zod";
import { DOCUMENT_TYPES } from "@dbpcms/shared";
import { NotFoundError, ValidationError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { prisma } from "../../core/db/prisma.js";
import { storage } from "../../core/file-storage/index.js";
import { processUpload } from "./file-processor.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const documentTypeSchema = z.enum(DOCUMENT_TYPES);

async function ensureEmployeeExists(employeeId: string): Promise<void> {
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
    select: { id: true },
  });
  if (!emp) throw new NotFoundError("Employee not found.");
}

export const documentsService = {
  async listForEmployee(employeeId: string) {
    await ensureEmployeeExists(employeeId);
    return prisma.document.findMany({
      where: { ownerType: "employee", ownerId: employeeId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        documentType: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });
  },

  async upload(
    employeeId: string,
    rawType: unknown,
    file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    actor: ActorMeta,
  ) {
    await ensureEmployeeExists(employeeId);
    if (!file) {
      throw new ValidationError([{ field: "file", message: "A file is required." }]);
    }
    const documentType = documentTypeSchema.parse(rawType);

    // Validate + (for images) compress.
    const processed = await processUpload(file.buffer, file.mimetype);

    // Generate a storage key that never uses the user's filename.
    const key = `employees/${employeeId}/${crypto.randomUUID()}.${processed.extension}`;
    await storage.save(key, processed.data, processed.mimeType);

    const created = await prisma.document.create({
      data: {
        ownerType: "employee",
        ownerId: employeeId,
        documentType,
        originalFilename: file.originalname.slice(0, 255),
        storageKey: key,
        mimeType: processed.mimeType,
        sizeBytes: processed.sizeBytes,
        checksum: processed.checksum,
        uploadedBy: actor.userId,
      },
      select: {
        id: true,
        documentType: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    await writeAudit({
      userId: actor.userId,
      action: "document.upload",
      entityType: "Document",
      entityId: created.id,
      after: { employeeId, documentType, filename: created.originalFilename },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    return created;
  },

  /** Returns the file bytes + metadata for a download (permission checked by route). */
  async getFile(employeeId: string, documentId: string) {
    const doc = await prisma.document.findFirst({
      where: {
        id: documentId,
        ownerType: "employee",
        ownerId: employeeId,
        deletedAt: null,
      },
    });
    if (!doc) throw new NotFoundError("Document not found.");
    const data = await storage.read(doc.storageKey);
    return { data, mimeType: doc.mimeType, filename: doc.originalFilename };
  },

  async remove(employeeId: string, documentId: string, actor: ActorMeta) {
    const doc = await prisma.document.findFirst({
      where: {
        id: documentId,
        ownerType: "employee",
        ownerId: employeeId,
        deletedAt: null,
      },
    });
    if (!doc) throw new NotFoundError("Document not found.");

    // Soft-delete the metadata; remove the bytes from storage.
    await prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
    await storage.delete(doc.storageKey);

    await writeAudit({
      userId: actor.userId,
      action: "document.delete",
      entityType: "Document",
      entityId: documentId,
      before: { filename: doc.originalFilename },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  },
};
