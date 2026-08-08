import { z } from "zod";

/** Validation for the grading configuration editors (Phase 6). */

export const gradeComponentSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60),
  weightPercent: z.coerce.number().min(0, "Weight must be 0 or more.").max(100),
  sequence: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type GradeComponentInput = z.infer<typeof gradeComponentSchema>;

export const scaleBandSchema = z
  .object({
    minPercent: z.coerce.number().min(0).max(100),
    maxPercent: z.coerce.number().min(0).max(100),
    letter: z.string().trim().min(1, "Letter is required.").max(5),
    gradePoint: z.coerce.number().min(0).max(10),
    isPass: z.boolean().default(true),
  })
  .refine((b) => b.maxPercent >= b.minPercent, {
    message: "Max % must be greater than or equal to min %.",
    path: ["maxPercent"],
  });
export type ScaleBandInput = z.infer<typeof scaleBandSchema>;

export const gradingScaleSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80),
  passMark: z.coerce.number().min(0).max(100).default(50),
  rounding: z.enum(["half_up", "truncate", "nearest"]).default("half_up"),
  bands: z.array(scaleBandSchema).min(1, "Add at least one grade band."),
});
export type GradingScaleInput = z.infer<typeof gradingScaleSchema>;

export const ROUNDING_LABELS: Record<string, string> = {
  half_up: "Round half up (84.5 → 85)",
  truncate: "Truncate (84.9 → 84)",
  nearest: "Round to nearest",
};
