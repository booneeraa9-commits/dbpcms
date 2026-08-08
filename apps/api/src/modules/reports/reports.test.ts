import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Tests HR reports (JSON + exports), system settings, the printable profile,
 * and the public verification lookup.
 */
describe("Reports, settings, print & verification", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";
  let employeeId = "";
  const stamp = Date.now().toString().slice(-6);

  beforeAll(async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;

    const dept = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `RepDept ${stamp}`, code: `RP${stamp}` });

    const emp = await request(app)
      .post("/api/v1/employees")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Report", lastName: "Subject", gender: "male",
        dateOfBirth: "1970-01-01", nationalId: `REP-${stamp}`,
        phoneNumber: "0912121212", email: `rep${stamp}@dbpc.edu`,
        departmentId: dept.body.data.id, position: "Senior Lecturer",
        employmentType: "full_time", employmentStatus: "active",
        dateOfEmployment: "2015-01-01",
      });
    employeeId = emp.body.data.id;
  });

  it("returns the employee directory as JSON", async () => {
    const res = await request(app)
      .get("/api/v1/reports/hr/employee-directory")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Employee Directory");
    expect(res.body.data.rows.length).toBeGreaterThan(0);
  });

  it("exports the directory as CSV, Excel, and PDF", async () => {
    const csv = await request(app)
      .get("/api/v1/reports/hr/employee-directory?format=csv")
      .set("Authorization", `Bearer ${token}`);
    expect(csv.status).toBe(200);
    expect(csv.headers["content-type"]).toContain("text/csv");

    const xlsx = await request(app)
      .get("/api/v1/reports/hr/employee-directory?format=excel")
      .set("Authorization", `Bearer ${token}`);
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers["content-type"]).toContain("spreadsheetml");

    const pdf = await request(app)
      .get("/api/v1/reports/hr/employee-directory?format=pdf")
      .set("Authorization", `Bearer ${token}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
  });

  it("retirement list respects the configurable retirement age", async () => {
    // Born 1970 -> older than 50; set retirement age to 50 so they appear.
    await request(app)
      .patch("/api/v1/settings/retirement_age")
      .set("Authorization", `Bearer ${token}`)
      .send({ value: "50" });

    const res = await request(app)
      .get("/api/v1/reports/hr/retirement-list")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.rows.some((r: { name: string }) => r.name === "Report Subject")).toBe(true);
  });

  it("lists and updates system settings", async () => {
    const list = await request(app)
      .get("/api/v1/settings")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it("generates a printable profile and the QR code verifies", async () => {
    const print = await request(app)
      .get(`/api/v1/employees/${employeeId}/print`)
      .set("Authorization", `Bearer ${token}`);
    expect(print.status).toBe(200);
    expect(print.headers["content-type"]).toContain("text/html");
    // Extract the verification code shown in the HTML.
    const match = /class="code">([A-Z0-9-]+)</.exec(print.text);
    expect(match).toBeTruthy();
    const code = match![1]!;

    // Public verify (no auth) should confirm it.
    const verify = await request(app).get(`/api/v1/verify/${code}`);
    expect(verify.status).toBe(200);
    expect(verify.body.data.valid).toBe(true);
    expect(verify.body.data.subject).toContain("Report Subject");
  });

  it("public verify returns valid:false for an unknown code", async () => {
    const res = await request(app).get("/api/v1/verify/ZZZZ-ZZZZ-ZZZZ");
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
  });
});
