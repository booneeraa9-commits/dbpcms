import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Tests for user management, focused on the SELF-LOCKOUT PROTECTION guards,
 * which are the highest-risk business rules in this module.
 */
describe("User management", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";
  let adminUserId = "";
  let instructorRoleId = "";
  const stamp = Date.now().toString().slice(-6);

  beforeAll(async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);
    adminUserId = me.body.data.user.id;

    const roles = await request(app)
      .get("/api/v1/users/roles")
      .set("Authorization", `Bearer ${token}`);
    instructorRoleId = roles.body.data.find(
      (r: { name: string }) => r.name === "instructor",
    ).id;
  });

  it("lists the built-in roles", async () => {
    const res = await request(app)
      .get("/api/v1/users/roles")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(8);
  });

  it("creates a new staff user with a role", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fullName: "Test Instructor",
        email: `instructor${stamp}@example.com`,
        temporaryPassword: "TempPassword123",
        roleIds: [instructorRoleId],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe(`instructor${stamp}@example.com`);
    expect(res.body.data.roles[0].name).toBe("instructor");
  });

  it("rejects a duplicate email (409)", async () => {
    const res = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fullName: "Dup",
        email: `instructor${stamp}@example.com`,
        temporaryPassword: "TempPassword123",
        roleIds: [instructorRoleId],
      });
    expect(res.status).toBe(409);
  });

  it("GUARD: admin cannot deactivate their own account (403)", async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${adminUserId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ isActive: false });
    expect(res.status).toBe(403);
  });

  it("GUARD: admin cannot remove their own admin role (403)", async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${adminUserId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ roleIds: [instructorRoleId] });
    expect(res.status).toBe(403);
  });

  it("GUARD: admin cannot delete their own account (403)", async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${adminUserId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
