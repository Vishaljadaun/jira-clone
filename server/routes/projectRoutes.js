const express = require("express");
const router = express.Router();
// 1. UPDATE THIS LINE to include 'addMember'
const {
  getProjects,
  createProject,
  addMember,
  getProject,
} = require("../controllers/projectController");
const { protect } = require("../middleware/authMiddleware");

// Route for getting list of projects and creating a new one
router.route("/").get(protect, getProjects).post(protect, createProject);

// Route for adding a member
router.route("/:id/add-member").put(protect, addMember);

router.get("/:id", protect, getProject);
module.exports = router;
