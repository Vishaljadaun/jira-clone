const mongoose = require("mongoose");
const Project = require("../models/Project");
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const validId = (id) =>
  typeof id === "string" && mongoose.isObjectIdOrHexString(id);
const belongs = (project, userId) =>
  [project.owner, ...project.members].some(
    (id) => String(id._id || id) === String(userId),
  );
async function projectAccess(id, userId) {
  if (!validId(String(id))) fail(400, "Invalid project ID.");
  const project = await Project.findById(id);
  if (!project || !belongs(project, userId)) fail(404, "Project not found.");
  return project;
}
module.exports = { fail, validId, belongs, projectAccess };
