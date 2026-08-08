import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Tests the dashboard summary: an admin sees count cards, the grade pipeline,
 * and a recent-activity feed (from the audit log).
 */
describe("Dashboard summary", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";

  beforeAll(async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/dashboard/summary");
    expect(res.status).toBe(401);
  });

  it("returns counts, pipeline, and activity for an admin", async () => {
    const res = await request(app).get("/api/v1/dashboard/summary").set({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    expect(res.body.data.roles).toContain("system_administrator");
    expect(res.body.data.counts).toHaveProperty("users");
    expect(res.body.data.counts).toHaveProperty("departments");
    expect(res.body.data.gradePipeline).toBeDefined();
    expect(Array.isArray(res.body.data.recentActivity)).toBe(true);
  });
});
