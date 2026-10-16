const express = require("express");
const router = express.Router();
const {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware");
const { addComment } = require("../controllers/taskController");
router.route("/").post(protect, createTask); // Create a task

// Note: We use :projectId to get ALL tasks for that project
router.route("/:projectId").get(protect, getTasks);

// We use :id (TaskId) for updating/deleting a specific task
router
  .route("/update/:id")
  .put(protect, updateTask)
  .delete(protect, deleteTask);

router.route("/:id/comments").post(protect, addComment);

module.exports = router;
