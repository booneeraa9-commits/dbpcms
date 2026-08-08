import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Integration tests for the departments module, run against the real test DB.
 * Verifies auth/permission enforcement, validation, the full CRUD cycle,
 * duplicate-code protection, and soft delete.
 */
describe("Departments", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";
  const uniqueCode = `TST${Date.now().toString().slice(-6)}`;
  let createdId = "";

  beforeAll(async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;
  });

  it("blocks listing without a token (401)", async () => {
    const res = await request(app).get("/api/v1/departments");
    expect(res.status).toBe(401);
  });

  it("rejects invalid create input (422)", async () => {
    const res = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "A", code: "" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("creates a department (201) and uppercases the code", async () => {
    const res = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Department", code: uniqueCode.toLowerCase() });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe(uniqueCode);
    createdId = res.body.data.id;
  });

  it("rejects a duplicate code (409)", async () => {
    const res = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Another", code: uniqueCode });
    expect(res.status).toBe(409);
  });

  it("lists departments with pagination meta", async () => {
    const res = await request(app)
      .get("/api/v1/departments?page=1&pageSize=5")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.pageSize).toBe(5);
    expect(res.body.meta.totalItems).toBeGreaterThan(0);
  });

  it("updates the department", async () => {
    const res = await request(app)
      .patch(`/api/v1/departments/${createdId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Renamed Department" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Renamed Department");
  });

  it("soft-deletes the department (204) and then 404s", async () => {
    const del = await request(app)
      .delete(`/api/v1/departments/${createdId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);

    const get = await request(app)
      .get(`/api/v1/departments/${createdId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(get.status).toBe(404);
  });
});
