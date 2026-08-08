import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../../app.js";

/**
 * Tests the employee portrait photo: upload (with a real generated PNG),
 * fetch, and rejection of non-images.
 */
describe("Employee photo", () => {
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
      .send({ name: `PhotoDept ${stamp}`, code: `PH${stamp}` });

    const emp = await request(app)
      .post("/api/v1/employees")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Photo", lastName: "Person", gender: "female",
        dateOfBirth: "1995-06-06", nationalId: `PH-${stamp}`,
        phoneNumber: "0913131313", email: `photo${stamp}@dbpc.edu`,
        departmentId: dept.body.data.id, position: "Assistant",
        employmentType: "full_time", employmentStatus: "active",
        dateOfEmployment: "2023-03-03",
      });
    employeeId = emp.body.data.id;
  });

  it("rejects a non-image upload", async () => {
    const res = await request(app)
      .post(`/api/v1/employees/${employeeId}/photo`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("not an image"), "note.txt");
    expect(res.status).toBe(422);
  });

  it("uploads a real image and can fetch it back as an image", async () => {
    const png = await sharp({
      create: { width: 300, height: 300, channels: 3, background: { r: 30, g: 90, b: 200 } },
    })
      .png()
      .toBuffer();

    const upload = await request(app)
      .post(`/api/v1/employees/${employeeId}/photo`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", png, "portrait.png");
    expect(upload.status).toBe(201);

    const fetchRes = await request(app)
      .get(`/api/v1/employees/${employeeId}/photo`)
      .set("Authorization", `Bearer ${token}`);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.headers["content-type"]).toContain("image/jpeg");
  });

  it("removes the photo", async () => {
    const del = await request(app)
      .delete(`/api/v1/employees/${employeeId}/photo`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);

    const fetchRes = await request(app)
      .get(`/api/v1/employees/${employeeId}/photo`)
      .set("Authorization", `Bearer ${token}`);
    expect(fetchRes.status).toBe(404);
  });
});
