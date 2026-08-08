import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * End-to-end test of the Student Academic Management flow:
 * program -> course -> section -> assign instructor -> student -> enroll.
 */
describe("Student academic management (Phase 5)", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";
  const stamp = Date.now().toString().slice(-6);
  let departmentId = "";
  let programId = "";
  let courseId = "";
  let semesterId = "";
  let sectionId = "";
  let studentId = "";
  let instructorId = "";

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;

    const dept = await request(app).post("/api/v1/departments").set(auth()).send({ name: `P5 Dept ${stamp}`, code: `P5${stamp}` });
    departmentId = dept.body.data.id;
    const prog = await request(app).post("/api/v1/programs").set(auth()).send({ name: `P5 Prog ${stamp}`, code: `PP${stamp}`, departmentId, degreeLevel: "Degree", durationYears: 4 });
    programId = prog.body.data.id;
    const year = await request(app).post("/api/v1/academic-years").set(auth()).send({ name: `20${stamp.slice(0,2)}/20${stamp.slice(2,4)}`, startDate: "2026-09-01", endDate: "2027-06-30" });
    const sem = await request(app).post("/api/v1/semesters").set(auth()).send({ academicYearId: year.body.data.id, name: "Semester I", sequence: 1, startDate: "2026-09-01", endDate: "2027-01-31", status: "active" });
    semesterId = sem.body.data.id;

    // Create an instructor user for assignment.
    const roles = await request(app).get("/api/v1/users/roles").set(auth());
    const instructorRoleId = roles.body.data.find((r: { name: string }) => r.name === "instructor").id;
    const inst = await request(app).post("/api/v1/users").set(auth()).send({
      fullName: "Test Instructor", email: `p5inst${stamp}@dbpc.edu`,
      temporaryPassword: "TempPassword123", roleIds: [instructorRoleId],
    });
    instructorId = inst.body.data.id;
  });

  it("creates a course (code uppercased)", async () => {
    const res = await request(app).post("/api/v1/courses").set(auth()).send({ code: `c${stamp}`, title: "Intro to Testing", creditHours: 3, programId });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe(`C${stamp}`);
    courseId = res.body.data.id;
  });

  it("creates a section for the course in the semester", async () => {
    const res = await request(app).post("/api/v1/sections").set(auth()).send({ courseId, semesterId, sectionLabel: "a", capacity: 40 });
    expect(res.status).toBe(201);
    expect(res.body.data.sectionLabel).toBe("A");
    sectionId = res.body.data.id;
  });

  it("rejects a duplicate section (409)", async () => {
    const res = await request(app).post("/api/v1/sections").set(auth()).send({ courseId, semesterId, sectionLabel: "A" });
    expect(res.status).toBe(409);
  });

  it("assigns the instructor to the section", async () => {
    const res = await request(app).post(`/api/v1/sections/${sectionId}/instructors`).set(auth()).send({ instructorId });
    expect(res.status).toBe(200);
    expect(res.body.data.instructors.length).toBe(1);
  });

  it("creates a student with an auto ID DBPC-STU-YYYY-NNNNN", async () => {
    const res = await request(app).post("/api/v1/students").set(auth()).send({
      firstName: "Chala", lastName: "Tesfaye", gender: "male",
      departmentId, programId, status: "active",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.studentNumber).toMatch(/^DBPC-STU-\d{4}-\d{5}$/);
    studentId = res.body.data.id;
  });

  it("rejects a student whose program is not in the department (409)", async () => {
    const otherDept = await request(app).post("/api/v1/departments").set(auth()).send({ name: `Other ${stamp}`, code: `OT${stamp}` });
    const res = await request(app).post("/api/v1/students").set(auth()).send({
      firstName: "Bad", lastName: "Match", gender: "female",
      departmentId: otherDept.body.data.id, programId, status: "active",
    });
    expect(res.status).toBe(409);
  });

  it("enrolls the student into the section, and blocks a duplicate", async () => {
    const enroll = await request(app).post(`/api/v1/sections/${sectionId}/enrollments`).set(auth()).send({ studentId });
    expect(enroll.status).toBe(201);

    const dup = await request(app).post(`/api/v1/sections/${sectionId}/enrollments`).set(auth()).send({ studentId });
    expect(dup.status).toBe(409);

    const list = await request(app).get(`/api/v1/sections/${sectionId}/enrollments`).set(auth());
    expect(list.body.data.length).toBe(1);
    expect(list.body.data[0].student.firstName).toBe("Chala");
  });
});
