import crypto from "node:crypto";
import { prisma } from "../../core/db/prisma.js";

/**
 * Issues and checks document verification codes. A code is a short, unique,
 * human-readable string also encoded into a QR. The public lookup confirms a
 * printed document is genuine without exposing sensitive data.
 */
function generateCode(): string {
  // 3 groups of 4 uppercase base32-ish chars, e.g. "K7QP-2M9X-4RTA".
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const pick = (): string =>
    Array.from({ length: 4 }, () =>
      alphabet[crypto.randomInt(alphabet.length)],
    ).join("");
  return `${pick()}-${pick()}-${pick()}`;
}

export const verificationService = {
  /** Creates (or returns existing latest) verification record for a subject. */
  async issue(params: {
    documentKind: string;
    subjectType: string;
    subjectId: string;
    subjectLabel: string;
    issuedBy?: string | null;
  }) {
    let code = generateCode();
    // Extremely unlikely collision; retry a few times to be safe.
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.documentVerification.findUnique({ where: { code } });
      if (!exists) break;
      code = generateCode();
    }
    return prisma.documentVerification.create({
      data: {
        code,
        documentKind: params.documentKind,
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        subjectLabel: params.subjectLabel,
        issuedBy: params.issuedBy ?? null,
      },
    });
  },

  /** Public check: returns a safe summary if the code is valid, else null. */
  async verify(code: string) {
    const record = await prisma.documentVerification.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!record || record.revokedAt) return null;
    return {
      valid: true,
      documentKind: record.documentKind,
      subject: record.subjectLabel,
      issuedAt: record.createdAt,
    };
  },
};
