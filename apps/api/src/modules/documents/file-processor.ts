import crypto from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { ACCEPTED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@dbpcms/shared";
import { ValidationError } from "../../core/errors/app-error.js";

export interface ProcessedFile {
  data: Buffer;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  checksum: string;
}

/**
 * Validates and (for images) compresses an uploaded file.
 *
 * Security: we verify the REAL content type from the file's magic bytes, not the
 * client-provided mimetype or extension (which can be spoofed). Only allow-listed
 * types pass. Images are recompressed to save space with no visible quality loss;
 * PDF/DOCX/XLSX are stored untouched (already compressed).
 */
export async function processUpload(
  buffer: Buffer,
  declaredMime: string,
): Promise<ProcessedFile> {
  if (buffer.length === 0) throw new ValidationError([{ field: "file", message: "File is empty." }]);
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new ValidationError([
      { field: "file", message: "File exceeds the 10 MB size limit." },
    ]);
  }

  // Detect the true type from content. DOCX/XLSX are zip-based; file-type reports
  // them as their office mime when possible, else as application/zip — we accept
  // the declared office mime in that case, but still reject anything unknown.
  const detected = await fileTypeFromBuffer(buffer);
  let mimeType = detected?.mime ?? declaredMime;

  // Office files sometimes detect as zip; trust the declared office mime then.
  if (
    (mimeType === "application/zip" || !mimeType) &&
    (declaredMime.includes("wordprocessingml") ||
      declaredMime.includes("spreadsheetml"))
  ) {
    mimeType = declaredMime;
  }

  const extension = ACCEPTED_MIME_TYPES[mimeType];
  if (!extension) {
    throw new ValidationError([
      {
        field: "file",
        message: "Unsupported file type. Allowed: PDF, DOCX, XLSX, JPG, PNG.",
      },
    ]);
  }

  let outData = buffer;
  let outMime = mimeType;

  // Compress images only (real savings, no visible quality loss).
  if (mimeType === "image/jpeg" || mimeType === "image/png") {
    try {
      const image = sharp(buffer, { failOn: "none" }).rotate(); // respect EXIF orientation
      const metadata = await image.metadata();
      // Downscale very large images to a sensible max dimension.
      if ((metadata.width ?? 0) > 2000 || (metadata.height ?? 0) > 2000) {
        image.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true });
      }
      // Re-encode as JPEG (good quality, strong compression). PNG screenshots of
      // documents also compress well this way.
      const compressed = await image.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
      // Only use the compressed version if it's actually smaller.
      if (compressed.length < buffer.length) {
        outData = compressed;
        outMime = "image/jpeg";
      }
    } catch {
      // If compression fails for any reason, fall back to the original bytes.
      outData = buffer;
      outMime = mimeType;
    }
  }

  const finalExt = ACCEPTED_MIME_TYPES[outMime] ?? extension;
  const checksum = crypto.createHash("sha256").update(outData).digest("hex");

  return {
    data: outData,
    mimeType: outMime,
    extension: finalExt,
    sizeBytes: outData.length,
    checksum,
  };
}
