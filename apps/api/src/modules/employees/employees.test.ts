import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Integration tests for employee registration, covering the auto-generated
 * employee number format, National ID uniqueness, and required-field validation.
 */
describe("Employees", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";
  let departmentId = "";
  const stamp = Date.now().toString().slice(-6);

  const validEmployee = () => ({
    firstName: "Abebe",
    lastName: "Bekele",
    gender: "male",
    dateOfBirth: "1990-05-15",
    nationalId: `NID-${stamp}`,
    phoneNumber: "0912345678",
    email: `abebe${stamp}@dbpc.edu`,
    departmentId,
    position: "Lecturer",
    employmentType: "full_time",
    employmentStatus: "active",
    dateOfEmployment: "2020-09-01",
  });

  beforeAll(async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;

    const dept = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `EmpDept ${stamp}`, code: `ED${stamp}` });
    departmentId = dept.body.data.id;
  });

  it("blocks listing without a token (401)", async () => {
    const res = await request(app).get("/api/v1/employees");
    expect(res.status).toBe(401);
  });

  it("rejects missing required fields (422)", async () => {
    const res = await request(app)
      .post("/api/v1/employees")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "OnlyName" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("creates an employee with an auto-generated number DBPC-EMP-YYYY-NNNNN", async () => {
    const res = await request(app)
      .post("/api/v1/employees")
      .set("Authorization", `Bearer ${token}`)
      .send(validEmployee());
    expect(res.status).toBe(201);
    expect(res.body.data.employeeNumber).toMatch(/^DBPC-EMP-\d{4}-\d{5}$/);
    expect(res.body.data.department.id).toBe(departmentId);
  });

  it("rejects a duplicate National ID (409)", async () => {
    const res = await request(app)
      .post("/api/v1/employees")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validEmployee(), email: `other${stamp}@dbpc.edu` });
    expect(res.status).toBe(409);
  });

  it("lists employees and can filter by department", async () => {
    const res = await request(app)
      .get(`/api/v1/employees?department=${departmentId}&page=1&pageSize=10`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.totalItems).toBeGreaterThan(0);
  });
});
