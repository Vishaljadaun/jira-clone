const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
process.env.JWT_SECRET = "disposable-tests-only-never-use-in-production";
const { createServer } = require("../app");
const User = require("../models/User");
let mongo, app, io, owner, member, outsider, project, task;
const header = (user) => ({ Authorization: `Bearer ${user.token}` });
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  ({ app, io } = createServer());
  await User.init();
  for (const name of ["owner", "member", "outsider"]) {
    const r = await request(app)
      .post("/api/users")
      .send({ name, email: `${name}@example.test`, password: "Testing-12345!" })
      .expect(201);
    if (name === "owner") owner = r.body;
    else if (name === "member") member = r.body;
    else outsider = r.body;
  }
  project = (
    await request(app)
      .post("/api/projects")
      .set(header(owner))
      .send({ name: "Launch", description: "Team workflow" })
      .expect(201)
  ).body;
});
after(async () => {
  io?.close();
  await mongoose.disconnect();
  await mongo?.stop();
});
test("profile save preserves password hash and login", async () => {
  await request(app)
    .put("/api/users/profile")
    .set(header(owner))
    .send({ name: "Owner renamed" })
    .expect(200);
  await request(app)
    .post("/api/users/login")
    .send({ email: "owner@example.test", password: "Testing-12345!" })
    .expect(200);
});
test("only owner adds registered members; duplicate additions are safe", async () => {
  await request(app)
    .put(`/api/projects/${project._id}/add-member`)
    .set(header(outsider))
    .send({ email: member.email })
    .expect(404);
  for (let i = 0; i < 2; i++)
    await request(app)
      .put(`/api/projects/${project._id}/add-member`)
      .set(header(owner))
      .send({ email: member.email })
      .expect(200);
  await request(app)
    .put(`/api/projects/${project._id}/add-member`)
    .set(header(member))
    .send({ email: outsider.email })
    .expect(403);
  const r = await request(app)
    .get(`/api/projects/${project._id}`)
    .set(header(member))
    .expect(200);
  assert.equal(r.body.members.length, 2);
});
test("members create assigned tasks with due dates; outsiders cannot read or create", async () => {
  await request(app)
    .post("/api/tasks")
    .set(header(outsider))
    .send({ projectId: project._id, title: "Intrusion" })
    .expect(404);
  await request(app)
    .get(`/api/tasks/${project._id}`)
    .set(header(outsider))
    .expect(404);
  task = (
    await request(app)
      .post("/api/tasks")
      .set(header(owner))
      .send({
        projectId: project._id,
        title: "Ship release",
        description: "Review first",
        assignee: member._id,
        dueDate: "2026-12-12",
        priority: "High",
      })
      .expect(201)
  ).body;
  assert.equal(task.assignee.name, "member");
  assert.equal(task.dueDate, "2026-12-12");
  const r = await request(app)
    .get(`/api/tasks/${project._id}`)
    .set(header(member))
    .expect(200);
  assert.equal(r.body.length, 1);
});
test("outsiders cannot edit, delete or comment on another project task", async () => {
  await request(app)
    .put(`/api/tasks/update/${task._id}`)
    .set(header(outsider))
    .send({ title: "Bad", version: task.__v })
    .expect(404);
  await request(app)
    .delete(`/api/tasks/update/${task._id}`)
    .set(header(outsider))
    .send({ version: task.__v })
    .expect(404);
  await request(app)
    .post(`/api/tasks/${task._id}/comments`)
    .set(header(outsider))
    .send({ text: "Bad" })
    .expect(404);
});
test("invalid fields and nonmember assignment leave the task unchanged", async () => {
  for (const fields of [
    { assignee: outsider._id },
    { dueDate: "2026-02-30" },
    { title: " " },
    { status: "Unknown" },
    { priority: "Urgent" },
  ]) {
    await request(app)
      .put(`/api/tasks/update/${task._id}`)
      .set(header(owner))
      .send({ ...fields, version: task.__v })
      .expect(400);
  }
});
test("concurrent edits allow one winner; clearing optional fields persists", async () => {
  const results = await Promise.all(
    ["In Progress", "Done"].map((status) =>
      request(app)
        .put(`/api/tasks/update/${task._id}`)
        .set(header(member))
        .send({ status, version: task.__v }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  task = results.find((r) => r.status === 200).body;
  task = (
    await request(app)
      .put(`/api/tasks/update/${task._id}`)
      .set(header(member))
      .send({ description: "", assignee: "", dueDate: "", version: task.__v })
      .expect(200)
  ).body;
  assert.equal(task.description, "");
  assert.equal(task.assignee, null);
  assert.equal(task.dueDate, null);
});
test("comments remain populated on reload and blank comments fail", async () => {
  await request(app)
    .post(`/api/tasks/${task._id}/comments`)
    .set(header(member))
    .send({ text: " " })
    .expect(400);
  await request(app)
    .post(`/api/tasks/${task._id}/comments`)
    .set(header(member))
    .send({ text: "Ready for review" })
    .expect(201);
  task = (
    await request(app)
      .get(`/api/tasks/${project._id}`)
      .set(header(owner))
      .expect(200)
  ).body[0];
  assert.equal(task.comments[0].user.name, "member");
  assert.equal(task.comments[0].text, "Ready for review");
});
test("deletion requires creator or owner and matching version", async () => {
  await request(app)
    .delete(`/api/tasks/update/${task._id}`)
    .set(header(member))
    .send({ version: task.__v })
    .expect(403);
  await request(app)
    .delete(`/api/tasks/update/${task._id}`)
    .set(header(owner))
    .send({})
    .expect(409);
  await request(app)
    .delete(`/api/tasks/update/${task._id}`)
    .set(header(owner))
    .send({ version: 999 })
    .expect(409);
  await request(app)
    .delete(`/api/tasks/update/${task._id}`)
    .set(header(owner))
    .send({ version: task.__v })
    .expect(200);
});
test("missing users and malformed IDs fail cleanly; uploads require login", async () => {
  await request(app)
    .get("/api/tasks/invalid-id")
    .set(header(owner))
    .expect(400);
  await request(app).post("/api/upload").expect(401);
  await User.findByIdAndDelete(outsider._id);
  await request(app).get("/api/projects").set(header(outsider)).expect(401);
});
