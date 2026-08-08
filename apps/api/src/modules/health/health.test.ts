import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * A tiny but real integration test: it starts the app in memory and makes a
 * genuine HTTP request. If this passes, the whole request pipeline works.
 */
describe("GET /api/v1/health", () => {
  const app = createApp();

  it("returns the standard success envelope with status ok", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.data.service).toBe("dbpcms-api");
    expect(response.body.meta.requestId).toBeTypeOf("string");
  });

  it("returns a consistent 404 envelope for unknown routes", async () => {
    const response = await request(app).get("/api/v1/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
