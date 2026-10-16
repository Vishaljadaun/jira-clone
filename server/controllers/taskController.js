const Task = require("../models/Task");
const { fail, validId, belongs, projectAccess } = require("../services/access");
const populate = (query) =>
  query
    .populate("assignee", "name avatar")
    .populate("reporter", "name")
    .populate("comments.user", "name avatar");
const notify = (req, project) =>
  req.app
    .get("io")
    ?.to(String(project))
    .emit("taskUpdated", { projectId: String(project) });
async function findTask(req) {
  if (!validId(req.params.id)) fail(400, "Invalid task ID.");
  const task = await Task.findById(req.params.id);
  if (!task) fail(404, "Task not found.");
  const project = await projectAccess(task.project, req.user._id);
  return { task, project };
}
function fields(body, project) {
  const result = {};
  for (const [key, limit] of [
    ["title", 200],
    ["description", 5000],
  ]) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "string" || body[key].length > limit)
        fail(400, `${key} must be text up to ${limit} characters.`);
      result[key] = body[key].trim();
      if (key === "title" && !result[key]) fail(400, "Title is required.");
    }
  }
  for (const [key, values] of [
    ["status", ["To Do", "In Progress", "Done"]],
    ["priority", ["Low", "Medium", "High"]],
  ]) {
    if (body[key] !== undefined) {
      if (!values.includes(body[key])) fail(400, `Invalid ${key}.`);
      result[key] = body[key];
    }
  }
  if (body.assignee !== undefined) {
    if (
      body.assignee &&
      (!validId(body.assignee) || !belongs(project, body.assignee))
    )
      fail(400, "Assignee must be a project member.");
    result.assignee = body.assignee || null;
  }
  if (body.dueDate !== undefined) {
    if (
      body.dueDate &&
      (typeof body.dueDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) ||
        !Number.isFinite(Date.parse(body.dueDate)) ||
        new Date(body.dueDate).toISOString().slice(0, 10) !== body.dueDate)
    )
      fail(400, "Choose a valid due date.");
    result.dueDate = body.dueDate || null;
  }
  return result;
}
exports.createTask = async (req, res) => {
  const project = await projectAccess(req.body.projectId, req.user._id);
  const input = fields(req.body, project);
  if (!input.title) fail(400, "Title is required.");
  const task = await Task.create({
    ...input,
    project: project._id,
    reporter: req.user._id,
  });
  const data = await populate(Task.findById(task._id));
  notify(req, project._id);
  res.status(201).json(data);
};
exports.getTasks = async (req, res) => {
  await projectAccess(req.params.projectId, req.user._id);
  res.json(
    await populate(
      Task.find({ project: req.params.projectId }).sort({ createdAt: -1 }),
    ),
  );
};
exports.updateTask = async (req, res) => {
  const { task, project } = await findTask(req);
  if (!Number.isInteger(req.body.version) || req.body.version !== task.__v)
    fail(409, "This task changed. Reload it before saving.");
  Object.assign(task, fields(req.body, project));
  await task.save();
  const data = await populate(Task.findById(task._id));
  notify(req, project._id);
  res.json(data);
};
exports.deleteTask = async (req, res) => {
  const { task, project } = await findTask(req);
  if (
    String(project.owner) !== String(req.user._id) &&
    String(task.reporter) !== String(req.user._id)
  )
    fail(403, "Only the project owner or task creator can delete this task.");
  if (!Number.isInteger(req.body?.version))
    fail(409, "Reload this task before deleting.");
  const result = await Task.deleteOne({ _id: task._id, __v: req.body.version });
  if (!result.deletedCount)
    fail(409, "This task changed. Reload it before deleting.");
  notify(req, project._id);
  res.json({ message: "Task removed" });
};
exports.addComment = async (req, res) => {
  const { task } = await findTask(req);
  const text = req.body.text;
  if (typeof text !== "string" || !text.trim() || text.length > 2000)
    fail(400, "Comment must contain 1–2000 characters.");
  task.comments.push({ text: text.trim(), user: req.user._id });
  await task.save();
  const data = await populate(Task.findById(task._id));
  notify(req, task.project);
  res.status(201).json(data);
};
