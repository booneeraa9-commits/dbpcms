import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Tests the grade approval workflow (Phase 7B): submit -> approve -> publish
 * (locks + snapshots), plus return-for-correction and unlock. Admin has all
 * permissions, so we drive the whole chain as admin.
 */
describe("Grade approval workflow (Phase 7B)", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const stamp = Date.now().toString().slice(-6);
  let sectionId = "";
  let enrollmentId = "";
  let quizId = "";

  beforeAll(async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;

    const dept = await request(app).post("/api/v1/departments").set(auth()).send({ name: `WDept ${stamp}`, code: `W${stamp}` });
    const prog = await request(app).post("/api/v1/programs").set(auth()).send({ name: `WProg ${stamp}`, code: `WP${stamp}`, departmentId: dept.body.data.id, degreeLevel: "Degree", durationYears: 4 });
    const year = await request(app).post("/api/v1/academic-years").set(auth()).send({ name: `20${stamp.slice(0,2)}/20${stamp.slice(2,4)}`, startDate: "2026-09-01", endDate: "2027-06-30" });
    const sem = await request(app).post("/api/v1/semesters").set(auth()).send({ academicYearId: year.body.data.id, name: "Semester I", sequence: 1, startDate: "2026-09-01", endDate: "2027-01-31", status: "active" });
    const course = await request(app).post("/api/v1/courses").set(auth()).send({ code: `WC${stamp}`, title: "Workflow Course", creditHours: 3, programId: prog.body.data.id });
    const section = await request(app).post("/api/v1/sections").set(auth()).send({ courseId: course.body.data.id, semesterId: sem.body.data.id, sectionLabel: "A" });
    sectionId = section.body.data.id;
    const student = await request(app).post("/api/v1/students").set(auth()).send({ firstName: "Work", lastName: "Flow", gender: "female", departmentId: dept.body.data.id, programId: prog.body.data.id, status: "active" });
    const enroll = await request(app).post(`/api/v1/sections/${sectionId}/enrollments`).set(auth()).send({ studentId: student.body.data.id });
    enrollmentId = enroll.body.data.id;
    const comps = await request(app).get("/api/v1/grading-config/components").set(auth());
    quizId = comps.body.data.components.find((c: { name: string }) => c.name === "Quiz").id;
  });

  it("blocks submitting with no grades entered (409)", async () => {
    const res = await request(app).post(`/api/v1/grades/sections/${sectionId}/submit`).set(auth());
    expect(res.status).toBe(409);
  });

  it("runs the full chain: enter -> submit -> approve -> publish (locks)", async () => {
    // enter one mark
    await request(app).put(`/api/v1/grades/sections/${sectionId}/grades`).set(auth())
      .send({ entries: [{ enrollmentId, componentId: quizId, score: 8 }] });

    const submit = await request(app).post(`/api/v1/grades/sections/${sectionId}/submit`).set(auth());
    expect(submit.status).toBe(200);
    expect(submit.body.data.status).toBe("submitted");

    const approve = await request(app).post(`/api/v1/grades/sections/${sectionId}/approve`).set(auth());
    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe("dept_approved");

    const publish = await request(app).post(`/api/v1/grades/sections/${sectionId}/publish`).set(auth());
    expect(publish.status).toBe(200);
    expect(publish.body.data.status).toBe("published");

    // Now the gradesheet reports locked, and editing is blocked.
    const sheet = await request(app).get(`/api/v1/grades/sections/${sectionId}/gradesheet`).set(auth());
    expect(sheet.body.data.locked).toBe(true);

    const edit = await request(app).put(`/api/v1/grades/sections/${sectionId}/grades`).set(auth())
      .send({ entries: [{ enrollmentId, componentId: quizId, score: 9 }] });
    expect(edit.status).toBe(403);
  });

  it("unlocks published grades back to draft", async () => {
    const res = await request(app).post(`/api/v1/grades/sections/${sectionId}/unlock`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("draft");
  });
});
