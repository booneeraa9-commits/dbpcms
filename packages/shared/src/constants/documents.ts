/** Document types and accepted formats for uploads (shared by both apps). */

export const DOCUMENT_TYPES = [
  "degree",
  "diploma",
  "certificate",
  "cv",
  "national_id",
  "passport",
  "employment_contract",
  "recommendation_letter",
  "other",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  degree: "Degree",
  diploma: "Diploma",
  certificate: "Certificate",
  cv: "CV / Résumé",
  national_id: "National ID",
  passport: "Passport",
  employment_contract: "Employment Contract",
  recommendation_letter: "Recommendation Letter",
  other: "Other",
};

/** Accepted MIME types → file extension. */
export const ACCEPTED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
