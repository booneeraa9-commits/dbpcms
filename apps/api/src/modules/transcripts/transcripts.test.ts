import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Tests transcripts + academic analytics after a full grade lifecycle:
 * enroll -> grade -> submit -> approve -> publish -> transcript reflects it.
 */
describe("Transcripts & academic analytics (Phase 8)", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const stamp = Date.now().toString().slice(-6);
  let studentId = "";
  let sectionId = "";
  let compIds: Record<string, string> = {};

  beforeAll(async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;
    const dept = await request(app).post("/api/v1/departments").set(auth()).send({ name: `TDept ${stamp}`, code: `T${stamp}` });
    const prog = await request(app).post("/api/v1/programs").set(auth()).send({ name: `TProg ${stamp}`, code: `TP${stamp}`, departmentId: dept.body.data.id, degreeLevel: "Degree", durationYears: 4 });
    const year = await request(app).post("/api/v1/academic-years").set(auth()).send({ name: `20${stamp.slice(0,2)}/20${stamp.slice(2,4)}`, startDate: "2026-09-01", endDate: "2027-06-30" });
    const sem = await request(app).post("/api/v1/semesters").set(auth()).send({ academicYearId: year.body.data.id, name: "Semester I", sequence: 1, startDate: "2026-09-01", endDate: "2027-01-31", status: "active" });
    const course = await request(app).post("/api/v1/courses").set(auth()).send({ code: `TC${stamp}`, title: "Transcript Course", creditHours: 3, programId: prog.body.data.id });
    const section = await request(app).post("/api/v1/sections").set(auth()).send({ courseId: course.body.data.id, semesterId: sem.body.data.id, sectionLabel: "A" });
    sectionId = section.body.data.id;
    const student = await request(app).post("/api/v1/students").set(auth()).send({ firstName: "Trans", lastName: "Cript", gender: "male", departmentId: dept.body.data.id, programId: prog.body.data.id, status: "active" });
    studentId = student.body.data.id;
    const enroll = await request(app).post(`/api/v1/sections/${sectionId}/enrollments`).set(auth()).send({ studentId });
    const enrollmentId = enroll.body.data.id;
    const comps = await request(app).get("/api/v1/grading-config/components").set(auth());
    for (const c of comps.body.data.components) compIds[c.name] = c.id;
    // full marks
    await request(app).put(`/api/v1/grades/sections/${sectionId}/grades`).set(auth()).send({ entries: [
      { enrollmentId, componentId: compIds["Quiz"], score: 10 },
      { enrollmentId, componentId: compIds["Assignment"], score: 15 },
      { enrollmentId, componentId: compIds["Mid Exam"], score: 25 },
      { enrollmentId, componentId: compIds["Final Exam"], score: 50 },
    ] });
  });

  it("transcript is empty before publishing", async () => {
    const res = await request(app).get(`/api/v1/transcripts/students/${studentId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.hasResults).toBe(false);
  });

  it("after publish, the transcript shows the course + GPA 4.0", async () => {
    await request(app).post(`/api/v1/grades/sections/${sectionId}/submit`).set(auth());
    await request(app).post(`/api/v1/grades/sections/${sectionId}/approve`).set(auth());
    const pub = await request(app).post(`/api/v1/grades/sections/${sectionId}/publish`).set(auth());
    expect(pub.status).toBe(200);

    const res = await request(app).get(`/api/v1/transcripts/students/${studentId}`).set(auth());
    expect(res.body.data.hasResults).toBe(true);
    expect(res.body.data.cumulativeGpa).toBe(4.0);
    expect(res.body.data.creditsEarned).toBe(3);
    expect(res.body.data.semesters[0].rows[0].letter).toBe("A+");
  });

  it("generates a printable transcript with a verification code", async () => {
    const print = await request(app).get(`/api/v1/transcripts/students/${studentId}/print`).set(auth());
    expect(print.status).toBe(200);
    expect(print.headers["content-type"]).toContain("text/html");
    const match = /class="code">([A-Z0-9-]+)</.exec(print.text);
    expect(match).toBeTruthy();
    const verify = await request(app).get(`/api/v1/verify/${match![1]}`);
    expect(verify.body.data.valid).toBe(true);
    expect(verify.body.data.documentKind).toBe("transcript");
  });

  it("pass-rate academic report includes the department", async () => {
    const res = await request(app).get("/api/v1/reports/academic/pass-rate").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Pass Rate by Department");
    expect(res.body.data.rows.length).toBeGreaterThan(0);
  });
});
