import { describe, expect, it } from "vitest";
import {
  applyRounding,
  computeWeightedPercentage,
  matchBand,
  calculateGrade,
  calculateGpa,
  type ScaleBand,
} from "./calculator.js";

/**
 * EXHAUSTIVE tests for the grade engine — this is the highest-risk logic in the
 * whole system, so we cover boundaries, ties, zero/full marks, missing weights,
 * and GPA math explicitly.
 */

const bands: ScaleBand[] = [
  { minPercent: 90, maxPercent: 100, letter: "A+", gradePoint: 4.0, isPass: true },
  { minPercent: 85, maxPercent: 89, letter: "A", gradePoint: 4.0, isPass: true },
  { minPercent: 80, maxPercent: 84, letter: "A-", gradePoint: 3.75, isPass: true },
  { minPercent: 75, maxPercent: 79, letter: "B+", gradePoint: 3.5, isPass: true },
  { minPercent: 70, maxPercent: 74, letter: "B", gradePoint: 3.0, isPass: true },
  { minPercent: 65, maxPercent: 69, letter: "B-", gradePoint: 2.75, isPass: true },
  { minPercent: 60, maxPercent: 64, letter: "C+", gradePoint: 2.5, isPass: true },
  { minPercent: 50, maxPercent: 59, letter: "C", gradePoint: 2.0, isPass: true },
  { minPercent: 40, maxPercent: 49, letter: "D", gradePoint: 1.0, isPass: false },
  { minPercent: 0, maxPercent: 39, letter: "F", gradePoint: 0, isPass: false },
];
const opts = { rounding: "half_up" as const, passMark: 50 };

describe("applyRounding", () => {
  it("half_up rounds .5 up", () => expect(applyRounding(84.5, "half_up")).toBe(85));
  it("half_up leaves .49 down", () => expect(applyRounding(84.49, "half_up")).toBe(84));
  it("truncate drops the fraction", () => expect(applyRounding(84.9, "truncate")).toBe(84));
  it("nearest rounds normally", () => expect(applyRounding(84.4, "nearest")).toBe(84));
});

describe("computeWeightedPercentage", () => {
  it("full marks on all components = 100%", () => {
    const pct = computeWeightedPercentage([
      { weightPercent: 10, score: 10, maxScore: 10 },
      { weightPercent: 15, score: 15, maxScore: 15 },
      { weightPercent: 25, score: 50, maxScore: 50 },
      { weightPercent: 50, score: 100, maxScore: 100 },
    ]);
    expect(pct).toBeCloseTo(100, 5);
  });

  it("zero marks = 0%", () => {
    const pct = computeWeightedPercentage([
      { weightPercent: 50, score: 0, maxScore: 100 },
      { weightPercent: 50, score: 0, maxScore: 50 },
    ]);
    expect(pct).toBe(0);
  });

  it("normalises when only some components are entered", () => {
    // Only the 50%-weight final entered, scored 80% -> normalised to 80%.
    const pct = computeWeightedPercentage([
      { weightPercent: 50, score: 80, maxScore: 100 },
    ]);
    expect(pct).toBeCloseTo(80, 5);
  });

  it("mixed scores compute correctly", () => {
    // Quiz 8/10 (.8*10=8), Assign 12/15 (.8*15=12), Mid 20/25 (.8*25=20), Final 80/100 (.8*50=40)
    // sum=80, totalWeight=100 -> 80%
    const pct = computeWeightedPercentage([
      { weightPercent: 10, score: 8, maxScore: 10 },
      { weightPercent: 15, score: 12, maxScore: 15 },
      { weightPercent: 25, score: 20, maxScore: 25 },
      { weightPercent: 50, score: 80, maxScore: 100 },
    ]);
    expect(pct).toBeCloseTo(80, 5);
  });

  it("clamps scores above max to the max", () => {
    const pct = computeWeightedPercentage([
      { weightPercent: 100, score: 120, maxScore: 100 },
    ]);
    expect(pct).toBe(100);
  });
});

describe("matchBand boundaries", () => {
  it("90 matches A+", () => expect(matchBand(90, bands)?.letter).toBe("A+"));
  it("89 matches A", () => expect(matchBand(89, bands)?.letter).toBe("A"));
  it("50 matches C (pass boundary)", () => expect(matchBand(50, bands)?.letter).toBe("C"));
  it("49 matches D (fail)", () => expect(matchBand(49, bands)?.letter).toBe("D"));
  it("0 matches F", () => expect(matchBand(0, bands)?.letter).toBe("F"));
  it("100 matches A+", () => expect(matchBand(100, bands)?.letter).toBe("A+"));
});

describe("calculateGrade end-to-end", () => {
  it("84.5% rounds to 85 -> A (the classic dispute case)", () => {
    const r = calculateGrade(
      [{ weightPercent: 100, score: 84.5, maxScore: 100 }],
      bands,
      opts,
    );
    expect(r.percentage).toBe(85);
    expect(r.letter).toBe("A");
    expect(r.gradePoint).toBe(4.0);
    expect(r.isPass).toBe(true);
  });

  it("49.4% -> D and fails (below pass mark)", () => {
    const r = calculateGrade(
      [{ weightPercent: 100, score: 49.4, maxScore: 100 }],
      bands,
      opts,
    );
    expect(r.percentage).toBe(49);
    expect(r.letter).toBe("D");
    expect(r.isPass).toBe(false);
  });

  it("exactly 50% passes with C", () => {
    const r = calculateGrade(
      [{ weightPercent: 100, score: 50, maxScore: 100 }],
      bands,
      opts,
    );
    expect(r.letter).toBe("C");
    expect(r.isPass).toBe(true);
  });

  it("returns nulls when no band matches", () => {
    const r = calculateGrade(
      [{ weightPercent: 100, score: 50, maxScore: 100 }],
      [{ minPercent: 90, maxPercent: 100, letter: "A", gradePoint: 4, isPass: true }],
      opts,
    );
    expect(r.letter).toBeNull();
    expect(r.isPass).toBeNull();
  });
});

describe("calculateGpa", () => {
  it("credit-weighted average", () => {
    // 4.0*3 + 3.0*2 + 2.0*1 = 12+6+2 = 20 over 6 credits = 3.33
    const gpa = calculateGpa([
      { gradePoint: 4.0, creditHours: 3 },
      { gradePoint: 3.0, creditHours: 2 },
      { gradePoint: 2.0, creditHours: 1 },
    ]);
    expect(gpa).toBeCloseTo(3.33, 2);
  });

  it("no courses = 0 GPA", () => expect(calculateGpa([])).toBe(0));

  it("all 4.0 = 4.0 GPA", () => {
    const gpa = calculateGpa([
      { gradePoint: 4.0, creditHours: 3 },
      { gradePoint: 4.0, creditHours: 4 },
    ]);
    expect(gpa).toBe(4.0);
  });
});
