import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/** Tests global search: finds a created department/employee, requires auth. */
describe("Global search", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";
  const stamp = Date.now().toString().slice(-6);

  beforeAll(async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;
    await request(app).post("/api/v1/departments").set({ Authorization: `Bearer ${token}` })
      .send({ name: `Searchable Dept ${stamp}`, code: `SRCH${stamp}` });
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/search?q=test");
    expect(res.status).toBe(401);
  });

  it("returns nothing for very short queries", async () => {
    const res = await request(app).get("/api/v1/search?q=a").set({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it("finds a department by name", async () => {
    const res = await request(app).get(`/api/v1/search?q=Searchable`).set({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    const dept = res.body.data.find((r: { type: string }) => r.type === "department");
    expect(dept).toBeTruthy();
    expect(dept.title).toContain("Searchable Dept");
  });
});
