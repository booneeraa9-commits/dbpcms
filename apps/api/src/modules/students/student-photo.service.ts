import crypto from "node:crypto";
import sharp from "sharp";
import { NotFoundError, ValidationError } from "../../core/errors/app-error.js";
import { writeAudit } from "../../core/audit/audit.js";
import { prisma } from "../../core/db/prisma.js";
import { storage } from "../../core/file-storage/index.js";

interface ActorMeta { userId: string; ipAddress?: string | null; userAgent?: string | null }
const MAX = 8 * 1024 * 1024;

/** Square-crop, resize, compress, and store a student's portrait photo. */
export const studentPhotoService = {
  async upload(studentId: string, file: { buffer: Buffer; mimetype: string } | undefined, actor: ActorMeta) {
    const s = await prisma.student.findFirst({ where: { id: studentId, deletedAt: null }, select: { id: true, photoStorageKey: true } });
    if (!s) throw new NotFoundError("Student not found.");
    if (!file) throw new ValidationError([{ field: "file", message: "An image is required." }]);
    if (!file.mimetype.startsWith("image/")) throw new ValidationError([{ field: "file", message: "Only image files are allowed." }]);
    if (file.buffer.length > MAX) throw new ValidationError([{ field: "file", message: "Image exceeds the 8 MB limit." }]);

    let processed: Buffer;
    try {
      processed = await sharp(file.buffer, { failOn: "none" }).rotate().resize(400, 400, { fit: "cover", position: "attention" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    } catch {
      throw new ValidationError([{ field: "file", message: "The image could not be processed." }]);
    }
    const key = `students/${studentId}/photo/${crypto.randomUUID()}.jpg`;
    await storage.save(key, processed, "image/jpeg");
    if (s.photoStorageKey) await storage.delete(s.photoStorageKey);
    await prisma.student.update({ where: { id: studentId }, data: { photoStorageKey: key } });
    await writeAudit({ userId: actor.userId, action: "student.photo.upload", entityType: "Student", entityId: studentId, ipAddress: actor.ipAddress, userAgent: actor.userAgent });
  },

  async getPhoto(studentId: string) {
    const s = await prisma.student.findFirst({ where: { id: studentId, deletedAt: null }, select: { photoStorageKey: true } });
    if (!s?.photoStorageKey) throw new NotFoundError("No photo set.");
    const data = await storage.read(s.photoStorageKey);
    return { data, mimeType: "image/jpeg" };
  },

  async remove(studentId: string, actor: ActorMeta) {
    const s = await prisma.student.findFirst({ where: { id: studentId, deletedAt: null }, select: { photoStorageKey: true } });
    if (!s) throw new NotFoundError("Student not found.");
    if (s.photoStorageKey) await storage.delete(s.photoStorageKey);
    await prisma.student.update({ where: { id: studentId }, data: { photoStorageKey: null } });
    await writeAudit({ userId: actor.userId, action: "student.photo.delete", entityType: "Student", entityId: studentId, ipAddress: actor.ipAddress, userAgent: actor.userAgent });
  },
};
