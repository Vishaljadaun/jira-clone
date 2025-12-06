const Project = require('../models/Project');
const User = require('../models/User'); // Essential for finding the user to invite

// @desc    Get all projects for the logged-in user
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    // Find projects where the user is the Owner OR a Member
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { members: req.user._id }
      ]
    })
    .populate('owner', 'name email')
    .sort({ createdAt: -1 }); // Sort by newest first

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Project name is required');
  }

  // Create the project using the logged-in user's ID as the owner
  const project = await Project.create({
    name,
    description,
    owner: req.user._id, 
    members: [req.user._id], // Owner is automatically a member
  });

  res.status(201).json(project);
};

// @desc    Add a user to a project
// @route   PUT /api/projects/:id/add-member
// @access  Private
const addMember = async (req, res) => {
  const { email } = req.body;
  const projectId = req.params.id;

  console.log("--- DEBUG ADD MEMBER ---");
  console.log("Searching for email:", email);

  try {
    // 1. Find the User to invite (Case Insensitive search)
    // This allows 'Partner@gmail.com' to match 'partner@gmail.com'
    const userToInvite = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });

    if (!userToInvite) {
      console.log("❌ User NOT found in DB");
      res.status(404);
      throw new Error('User not found. They must register first.');
    }

    console.log("✅ User found:", userToInvite.name);

    // 2. Find the Project
    const project = await Project.findById(projectId);

    if (!project) {
      res.status(404);
      throw new Error('Project not found');
    }

    // 3. Security Check: Only the Owner or existing Members can invite others
    // (Optional: You can restrict this to only the Owner if you want)
    const isMember = project.members.some(memberId => memberId.equals(req.user._id));
    if (!isMember && !project.owner.equals(req.user._id)) {
        res.status(401);
        throw new Error('Not authorized to invite to this project');
    }

    // 4. Check if user is ALREADY a member
    if (project.members.includes(userToInvite._id)) {
      console.log("⚠️ User is already a member");
      res.status(400);
      throw new Error('User is already a member of this project');
    }

    // 5. Add them to the array
    project.members.push(userToInvite._id);
    await project.save();

    console.log("✅ User added successfully!");
    
    // Return the updated project
    res.json(project);
    
  } catch (error) {
    console.error("Add Member Error:", error.message);
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    res.json({ message: error.message });
  }
};

module.exports = { getProjects, createProject, addMember };