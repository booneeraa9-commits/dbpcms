import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Integration tests for programs + academic years, covering the cross-entity
 * rules (program needs a real department; setting a current year is exclusive).
 */
describe("Programs & Academic Years", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";
  const stamp = Date.now().toString().slice(-6);
  let departmentId = "";

  beforeAll(async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;

    const dept = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `Dept ${stamp}`, code: `D${stamp}` });
    departmentId = dept.body.data.id;
  });

  it("rejects a program with a non-existent department (404)", async () => {
    const res = await request(app)
      .post("/api/v1/programs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Ghost Program",
        code: `G${stamp}`,
        departmentId: "00000000-0000-0000-0000-000000000000",
        degreeLevel: "Degree",
        durationYears: 4,
      });
    expect(res.status).toBe(404);
  });

  it("creates a program linked to a real department", async () => {
    const res = await request(app)
      .post("/api/v1/programs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: `Program ${stamp}`,
        code: `P${stamp}`,
        departmentId,
        degreeLevel: "Degree",
        durationYears: 4,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe(`P${stamp}`);
  });

  it("creates an academic year and can set it current (exclusive)", async () => {
    const y1 = await request(app)
      .post("/api/v1/academic-years")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `20${stamp.slice(0, 2)}/20${stamp.slice(2, 4)}`, startDate: "2026-09-01", endDate: "2027-06-30" });
    // name may clash across test runs; accept 201 or 409
    expect([201, 409]).toContain(y1.status);

    const list = await request(app)
      .get("/api/v1/academic-years")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    const anyYear = list.body.data[0];
    if (anyYear) {
      const setCurrent = await request(app)
        .post(`/api/v1/academic-years/${anyYear.id}/set-current`)
        .set("Authorization", `Bearer ${token}`);
      expect(setCurrent.status).toBe(200);
      expect(setCurrent.body.data.isCurrent).toBe(true);

      // Exactly one current year.
      const after = await request(app)
        .get("/api/v1/academic-years")
        .set("Authorization", `Bearer ${token}`);
      const currentCount = after.body.data.filter(
        (y: { isCurrent: boolean }) => y.isCurrent,
      ).length;
      expect(currentCount).toBe(1);
    }
  });
});
