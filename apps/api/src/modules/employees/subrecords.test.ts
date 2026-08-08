import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

/**
 * Tests the four employee sub-record types (education, qualifications,
 * employment history, emergency contacts) via their nested routes.
 */
describe("Employee sub-records", () => {
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
      .send({ name: `SubDept ${stamp}`, code: `SD${stamp}` });

    const emp = await request(app)
      .post("/api/v1/employees")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Sub",
        lastName: "Record",
        gender: "female",
        dateOfBirth: "1992-01-01",
        nationalId: `SUB-${stamp}`,
        phoneNumber: "0911111111",
        email: `sub${stamp}@dbpc.edu`,
        departmentId: dept.body.data.id,
        position: "Technician",
        employmentType: "full_time",
        employmentStatus: "active",
        dateOfEmployment: "2021-01-01",
      });
    employeeId = emp.body.data.id;
  });

  it("adds and lists an education entry", async () => {
    const create = await request(app)
      .post(`/api/v1/employees/${employeeId}/education`)
      .set("Authorization", `Bearer ${token}`)
      .send({ institution: "Addis Ababa University", qualification: "BSc", graduationYear: 2014 });
    expect(create.status).toBe(201);

    const list = await request(app)
      .get(`/api/v1/employees/${employeeId}/education`)
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
    expect(list.body.data[0].institution).toBe("Addis Ababa University");
  });

  it("adds a qualification with a type", async () => {
    const res = await request(app)
      .post(`/api/v1/employees/${employeeId}/qualifications`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "certification", title: "PMP" });
    expect(res.status).toBe(201);
  });

  it("adds an employment history entry", async () => {
    const res = await request(app)
      .post(`/api/v1/employees/${employeeId}/employment-history`)
      .set("Authorization", `Bearer ${token}`)
      .send({ employer: "Old Company", position: "Junior Tech" });
    expect(res.status).toBe(201);
  });

  it("adds, updates, and deletes an emergency contact", async () => {
    const create = await request(app)
      .post(`/api/v1/employees/${employeeId}/emergency-contacts`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Next Ofkin", phoneNumber: "0922222222", relationship: "Sister" });
    expect(create.status).toBe(201);
    const id = create.body.data.id;

    const update = await request(app)
      .patch(`/api/v1/employees/${employeeId}/emergency-contacts/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Next OfKin", phoneNumber: "0933333333", relationship: "Brother" });
    expect(update.status).toBe(200);

    const del = await request(app)
      .delete(`/api/v1/employees/${employeeId}/emergency-contacts/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);
  });

  it("rejects invalid education input (422)", async () => {
    const res = await request(app)
      .post(`/api/v1/employees/${employeeId}/education`)
      .set("Authorization", `Bearer ${token}`)
      .send({ institution: "X" });
    expect(res.status).toBe(422);
  });
});
