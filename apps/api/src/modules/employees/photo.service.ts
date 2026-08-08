import crypto from "node:crypto";
import sharp from "sharp";
import { NotFoundError, ValidationError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { prisma } from "../../core/db/prisma.js";
import { storage } from "../../core/file-storage/index.js";

interface ActorMeta {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB before processing

/**
 * Handles the employee portrait photo: validates it's an image, crops it to a
 * square, resizes to a small portrait, compresses to JPEG, and stores it. Only
 * the storage key is kept on the employee row.
 */
export const photoService = {
  async upload(
    employeeId: string,
    file: { buffer: Buffer; mimetype: string } | undefined,
    actor: ActorMeta,
  ) {
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
      select: { id: true, photoStorageKey: true },
    });
    if (!emp) throw new NotFoundError("Employee not found.");

    if (!file) throw new ValidationError([{ field: "file", message: "An image is required." }]);
    if (!file.mimetype.startsWith("image/")) {
      throw new ValidationError([{ field: "file", message: "Only image files are allowed." }]);
    }
    if (file.buffer.length > MAX_PHOTO_BYTES) {
      throw new ValidationError([{ field: "file", message: "Image exceeds the 8 MB limit." }]);
    }

    // Square-crop + resize + compress. Fails safe if the image is unreadable.
    let processed: Buffer;
    try {
      processed = await sharp(file.buffer, { failOn: "none" })
        .rotate()
        .resize(400, 400, { fit: "cover", position: "attention" })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    } catch {
      throw new ValidationError([{ field: "file", message: "The image could not be processed." }]);
    }

    const key = `employees/${employeeId}/photo/${crypto.randomUUID()}.jpg`;
    await storage.save(key, processed, "image/jpeg");

    // Remove the previous photo bytes (best-effort).
    if (emp.photoStorageKey) await storage.delete(emp.photoStorageKey);

    await prisma.employee.update({
      where: { id: employeeId },
      data: { photoStorageKey: key },
    });

    await writeAudit({
      userId: actor.userId,
      action: "employee.photo.upload",
      entityType: "Employee",
      entityId: employeeId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  },

  async getPhoto(employeeId: string) {
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
      select: { photoStorageKey: true },
    });
    if (!emp?.photoStorageKey) throw new NotFoundError("No photo set.");
    const data = await storage.read(emp.photoStorageKey);
    return { data, mimeType: "image/jpeg" };
  },

  /** Returns the photo as a data URL for embedding in the printable profile. */
  async getPhotoDataUrl(employeeId: string): Promise<string | null> {
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
      select: { photoStorageKey: true },
    });
    if (!emp?.photoStorageKey) return null;
    try {
      const data = await storage.read(emp.photoStorageKey);
      return `data:image/jpeg;base64,${data.toString("base64")}`;
    } catch {
      return null;
    }
  },

  async remove(employeeId: string, actor: ActorMeta) {
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
      select: { photoStorageKey: true },
    });
    if (!emp) throw new NotFoundError("Employee not found.");
    if (emp.photoStorageKey) await storage.delete(emp.photoStorageKey);
    await prisma.employee.update({
      where: { id: employeeId },
      data: { photoStorageKey: null },
    });
    await writeAudit({
      userId: actor.userId,
      action: "employee.photo.delete",
      entityType: "Employee",
      entityId: employeeId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
  },
};
