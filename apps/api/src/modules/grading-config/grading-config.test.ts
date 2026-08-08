import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Tests the grading configuration API: seeded defaults, component weight total,
 * saving a scale, and rejection of overlapping bands.
 */
describe("Grading configuration", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;
  });

  it("returns seeded components totalling 100%", async () => {
    const res = await request(app).get("/api/v1/grading-config/components").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.components.length).toBeGreaterThanOrEqual(4);
    expect(res.body.data.weightTotal).toBe(100);
  });

  it("returns the seeded active 4.0 scale", async () => {
    const res = await request(app).get("/api/v1/grading-config/scales/active").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Standard 4.0");
    expect(res.body.data.bands.length).toBe(10);
  });

  it("adds a component", async () => {
    const res = await request(app).post("/api/v1/grading-config/components").set(auth())
      .send({ name: "Presentation", weightPercent: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Presentation");
  });

  it("rejects overlapping bands when saving a scale (422)", async () => {
    const res = await request(app).post("/api/v1/grading-config/scales").set(auth()).send({
      name: "Bad Scale", passMark: 50, rounding: "half_up",
      bands: [
        { minPercent: 50, maxPercent: 100, letter: "A", gradePoint: 4, isPass: true },
        { minPercent: 40, maxPercent: 60, letter: "B", gradePoint: 3, isPass: true },
      ],
    });
    expect(res.status).toBe(422);
  });

  it("saves a valid new scale and makes it active", async () => {
    const res = await request(app).post("/api/v1/grading-config/scales").set(auth()).send({
      name: "Simple Scale", passMark: 50, rounding: "half_up",
      bands: [
        { minPercent: 50, maxPercent: 100, letter: "P", gradePoint: 4, isPass: true },
        { minPercent: 0, maxPercent: 49, letter: "F", gradePoint: 0, isPass: false },
      ],
    });
    expect(res.status).toBe(201);
    const active = await request(app).get("/api/v1/grading-config/scales/active").set(auth());
    expect(active.body.data.name).toBe("Simple Scale");
  });
});
