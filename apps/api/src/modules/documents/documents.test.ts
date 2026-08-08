import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Tests the document upload pipeline: type validation, upload, list, download,
 * and delete. Uses a tiny valid PDF and a fake "exe" to check rejection.
 */
describe("Documents", () => {
  const app = createApp();
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "booneeraa9@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Abbaakoo1@Abbaakoo1@";
  let token = "";
  let employeeId = "";
  const stamp = Date.now().toString().slice(-6);

  // Minimal valid PDF bytes (starts with %PDF-).
  const pdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF",
    "utf-8",
  );

  beforeAll(async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminEmail, password: adminPassword });
    token = login.body.data.accessToken;

    const dept = await request(app)
      .post("/api/v1/departments")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: `DocDept ${stamp}`, code: `DC${stamp}` });

    const emp = await request(app)
      .post("/api/v1/employees")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Doc",
        lastName: "Owner",
        gender: "male",
        dateOfBirth: "1988-03-03",
        nationalId: `DOC-${stamp}`,
        phoneNumber: "0900000000",
        email: `doc${stamp}@dbpc.edu`,
        departmentId: dept.body.data.id,
        position: "Clerk",
        employmentType: "full_time",
        employmentStatus: "active",
        dateOfEmployment: "2022-02-02",
      });
    employeeId = emp.body.data.id;
  });

  it("rejects a disallowed file type", async () => {
    const res = await request(app)
      .post(`/api/v1/employees/${employeeId}/documents`)
      .set("Authorization", `Bearer ${token}`)
      .field("documentType", "cv")
      .attach("file", Buffer.from("MZ fake exe"), "malware.exe");
    expect(res.status).toBe(422);
  });

  it("uploads a PDF, lists it, downloads it, then deletes it", async () => {
    const upload = await request(app)
      .post(`/api/v1/employees/${employeeId}/documents`)
      .set("Authorization", `Bearer ${token}`)
      .field("documentType", "degree")
      .attach("file", pdfBuffer, "degree.pdf");
    expect(upload.status).toBe(201);
    expect(upload.body.data.documentType).toBe("degree");
    const docId = upload.body.data.id;

    const list = await request(app)
      .get(`/api/v1/employees/${employeeId}/documents`)
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);

    const download = await request(app)
      .get(`/api/v1/employees/${employeeId}/documents/${docId}/download`)
      .set("Authorization", `Bearer ${token}`);
    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toContain("application/pdf");

    const del = await request(app)
      .delete(`/api/v1/employees/${employeeId}/documents/${docId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);

    const listAfter = await request(app)
      .get(`/api/v1/employees/${employeeId}/documents`)
      .set("Authorization", `Bearer ${token}`);
    expect(listAfter.body.data.length).toBe(0);
  });

  it("blocks download without a token (401)", async () => {
    const res = await request(app).get(
      `/api/v1/employees/${employeeId}/documents/00000000-0000-0000-0000-000000000000/download`,
    );
    expect(res.status).toBe(401);
  });
});
