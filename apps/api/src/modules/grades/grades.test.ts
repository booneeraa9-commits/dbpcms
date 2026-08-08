import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Tests grade entry (Phase 7A): building the gradesheet, saving marks, and the
 * live-computed result matching the seeded 4.0 scale.
 */
describe("Grade entry (Phase 7A)", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const stamp = Date.now().toString().slice(-6);
  let sectionId = "";
  let enrollmentId = "";
  let componentIds: Record<string, string> = {};

  beforeAll(async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;

    const dept = await request(app).post("/api/v1/departments").set(auth()).send({ name: `GDept ${stamp}`, code: `G${stamp}` });
    const prog = await request(app).post("/api/v1/programs").set(auth()).send({ name: `GProg ${stamp}`, code: `GP${stamp}`, departmentId: dept.body.data.id, degreeLevel: "Degree", durationYears: 4 });
    const year = await request(app).post("/api/v1/academic-years").set(auth()).send({ name: `20${stamp.slice(0,2)}/20${stamp.slice(2,4)}`, startDate: "2026-09-01", endDate: "2027-06-30" });
    const sem = await request(app).post("/api/v1/semesters").set(auth()).send({ academicYearId: year.body.data.id, name: "Semester I", sequence: 1, startDate: "2026-09-01", endDate: "2027-01-31", status: "active" });
    const course = await request(app).post("/api/v1/courses").set(auth()).send({ code: `GC${stamp}`, title: "Grading Course", creditHours: 3, programId: prog.body.data.id });
    const section = await request(app).post("/api/v1/sections").set(auth()).send({ courseId: course.body.data.id, semesterId: sem.body.data.id, sectionLabel: "A" });
    sectionId = section.body.data.id;
    const student = await request(app).post("/api/v1/students").set(auth()).send({ firstName: "Grade", lastName: "Getter", gender: "male", departmentId: dept.body.data.id, programId: prog.body.data.id, status: "active" });
    const enroll = await request(app).post(`/api/v1/sections/${sectionId}/enrollments`).set(auth()).send({ studentId: student.body.data.id });
    enrollmentId = enroll.body.data.id;

    const comps = await request(app).get("/api/v1/grading-config/components").set(auth());
    for (const c of comps.body.data.components) componentIds[c.name] = c.id;
  });

  it("builds a gradesheet with components and the enrolled student", async () => {
    const res = await request(app).get(`/api/v1/grades/sections/${sectionId}/gradesheet`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.components.length).toBeGreaterThanOrEqual(4);
    expect(res.body.data.rows.length).toBe(1);
    expect(res.body.data.status).toBe("draft");
    expect(res.body.data.locked).toBe(false);
  });

  it("saves full marks and computes 100% -> A+ (pass)", async () => {
    const entries = [
      { enrollmentId, componentId: componentIds["Quiz"], score: 10, maxScore: 10 },
      { enrollmentId, componentId: componentIds["Assignment"], score: 15, maxScore: 15 },
      { enrollmentId, componentId: componentIds["Mid Exam"], score: 25, maxScore: 25 },
      { enrollmentId, componentId: componentIds["Final Exam"], score: 50, maxScore: 50 },
    ];
    const res = await request(app).put(`/api/v1/grades/sections/${sectionId}/grades`).set(auth()).send({ entries });
    expect(res.status).toBe(200);
    const row = res.body.data.rows[0];
    expect(row.result.percentage).toBe(100);
    expect(row.result.letter).toBe("A+");
    expect(row.result.isPass).toBe(true);
  });

  it("recomputes to a fail when ALL components are low", async () => {
    // Saving is incremental (upsert), so we overwrite every component with a low
    // score to bring the overall result down to a fail.
    const entries = [
      { enrollmentId, componentId: componentIds["Quiz"], score: 2, maxScore: 10 },
      { enrollmentId, componentId: componentIds["Assignment"], score: 3, maxScore: 15 },
      { enrollmentId, componentId: componentIds["Mid Exam"], score: 5, maxScore: 25 },
      { enrollmentId, componentId: componentIds["Final Exam"], score: 10, maxScore: 50 },
    ];
    const res = await request(app).put(`/api/v1/grades/sections/${sectionId}/grades`).set(auth()).send({ entries });
    const row = res.body.data.rows[0];
    expect(row.result.isPass).toBe(false);
  });
});
