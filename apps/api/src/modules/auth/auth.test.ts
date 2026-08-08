import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Integration tests for authentication, run against the real (test) database.
 * The admin account is created by the seed script before these run.
 *
 * These prove the highest-risk security behaviours: correct login, rejection of
 * bad credentials, and that protected routes reject unauthenticated callers.
 */
describe("Authentication", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";

  it("rejects login with a wrong password (401, generic message)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: "definitely-wrong" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe("Invalid email or password.");
  });

  it("rejects malformed input with 422 validation error", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "not-an-email", password: "" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("logs in the seeded admin and returns an access token + user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTypeOf("string");
    expect(res.body.data.user.email).toBe(adminEmail.toLowerCase());
    expect(res.body.data.user.roles).toContain("system_administrator");
    expect(res.body.data.user.permissions.length).toBeGreaterThan(0);
    // Seeded admin must change password on first login.
    expect(res.body.data.user.mustChangePassword).toBe(true);
    // Refresh token is set as an HttpOnly cookie, not in the body.
    const cookies = res.headers["set-cookie"];
    expect(String(cookies)).toContain("dbpcms_refresh_token");
  });

  it("blocks /auth/me without a token (401)", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("allows /auth/me with a valid token", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword });
    const token = login.body.data.accessToken as string;

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(adminEmail.toLowerCase());
  });
});
