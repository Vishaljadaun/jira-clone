const Project = require("../models/Project");
const User = require("../models/User");
const { fail, projectAccess } = require("../services/access");
const people = (query) =>
  query
    .populate("owner", "name email avatar")
    .populate("members", "name email avatar");
exports.getProjects = async (req, res) =>
  res.json(
    await people(
      Project.find({
        $or: [{ owner: req.user._id }, { members: req.user._id }],
      }).sort({ createdAt: -1 }),
    ),
  );
exports.getProject = async (req, res) => {
  await projectAccess(req.params.id, req.user._id);
  res.json(await people(Project.findById(req.params.id)));
};
exports.createProject = async (req, res) => {
  const { name, description = "" } = req.body;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 120 ||
    typeof description !== "string" ||
    description.length > 2000
  )
    fail(
      400,
      "Provide a project name (up to 120 characters) and description (up to 2000).",
    );
  const project = await Project.create({
    name: name.trim(),
    description: description.trim(),
    owner: req.user._id,
    members: [req.user._id],
  });
  res.status(201).json(await people(Project.findById(project._id)));
};
exports.addMember = async (req, res) => {
  const project = await projectAccess(req.params.id, req.user._id);
  if (String(project.owner) !== String(req.user._id))
    fail(403, "Only the project owner can add members.");
  if (typeof req.body.email !== "string" || req.body.email.length > 254)
    fail(400, "Enter a valid email.");
  const email = req.body.email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const user = await User.findOne({
    email: { $regex: `^${email}$`, $options: "i" },
  });
  if (!user) fail(404, "User not found. They must register first.");
  await Project.updateOne(
    { _id: project._id },
    { $addToSet: { members: user._id } },
  );
  req.app.get("io")?.to(String(project._id)).emit("projectUpdated");
  res.json(await people(Project.findById(project._id)));
};
