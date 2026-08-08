/**
 * The grade calculation engine — PURE functions, no database, fully testable.
 *
 * Given a set of component scores + weights, a grading scale, and rounding rule,
 * it produces the weighted percentage, matched letter grade, grade point, and
 * pass/fail. Keeping this pure means we can test every tricky edge case exhaustively.
 */

export type RoundingRule = "half_up" | "truncate" | "nearest";

export interface ComponentScore {
  /** Weight of this component as a percentage of the total (e.g. 25 for 25%). */
  weightPercent: number;
  /** The score the student got on this component. */
  score: number;
  /** The maximum possible score for this component (e.g. 100, or 25). */
  maxScore: number;
}

export interface ScaleBand {
  minPercent: number;
  maxPercent: number;
  letter: string;
  gradePoint: number;
  isPass: boolean;
}

export interface GradeResult {
  /** Weighted percentage 0–100, before rounding for band matching. */
  rawPercentage: number;
  /** The percentage used to match a band (after rounding). */
  percentage: number;
  letter: string | null;
  gradePoint: number | null;
  isPass: boolean | null;
}

/** Rounds a value to a whole number per the chosen rule. */
export function applyRounding(value: number, rule: RoundingRule): number {
  switch (rule) {
    case "truncate":
      return Math.floor(value);
    case "nearest":
      return Math.round(value); // ties go to +Infinity in JS (0.5 -> 1)
    case "half_up":
    default:
      // Explicit half-up that also works for negatives predictably.
      return Math.floor(value + 0.5);
  }
}

/**
 * Computes the weighted percentage from component scores.
 * Each component contributes (score/maxScore) * weightPercent.
 * If the provided weights don't sum to 100, we normalise by the total weight
 * actually present, so partial/among-entered components still yield a sensible %.
 */
export function computeWeightedPercentage(components: ComponentScore[]): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const c of components) {
    if (c.maxScore <= 0) continue;
    const fraction = Math.min(Math.max(c.score / c.maxScore, 0), 1);
    weightedSum += fraction * c.weightPercent;
    totalWeight += c.weightPercent;
  }
  if (totalWeight === 0) return 0;
  // Normalise to a 0–100 scale relative to the weights present.
  return (weightedSum / totalWeight) * 100;
}

/** Finds the band whose range contains the given percentage. */
export function matchBand(
  percentage: number,
  bands: ScaleBand[],
): ScaleBand | null {
  for (const b of bands) {
    if (percentage >= b.minPercent && percentage <= b.maxPercent) return b;
  }
  return null;
}

/**
 * The full calculation: components + scale + rounding + pass mark -> result.
 */
export function calculateGrade(
  components: ComponentScore[],
  bands: ScaleBand[],
  options: { rounding: RoundingRule; passMark: number },
): GradeResult {
  const rawPercentage = computeWeightedPercentage(components);
  const percentage = applyRounding(rawPercentage, options.rounding);
  const band = matchBand(percentage, bands);

  if (!band) {
    return { rawPercentage, percentage, letter: null, gradePoint: null, isPass: null };
  }

  // Pass is driven by the band's isPass flag AND the pass-mark threshold, so an
  // institution can express "must reach X%" independently of letter bands.
  const isPass = band.isPass && percentage >= options.passMark;

  return {
    rawPercentage,
    percentage,
    letter: band.letter,
    gradePoint: band.gradePoint,
    isPass,
  };
}

/**
 * Computes a GPA (credit-weighted average of grade points).
 * Each course contributes gradePoint * creditHours; GPA = sum / total credits.
 */
export function calculateGpa(
  courses: { gradePoint: number; creditHours: number }[],
): number {
  let points = 0;
  let credits = 0;
  for (const c of courses) {
    points += c.gradePoint * c.creditHours;
    credits += c.creditHours;
  }
  if (credits === 0) return 0;
  // Round GPA to 2 decimal places.
  return Math.round((points / credits) * 100) / 100;
}
