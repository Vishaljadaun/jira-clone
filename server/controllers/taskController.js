const Task = require('../models/Task');
const Project = require('../models/Project');

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  const { title, description, projectId, priority, status } = req.body;

  // Simple validation
  if (!title || !projectId) {
    res.status(400);
    throw new Error('Title and Project ID are required');
  }

  // (Optional) Check if project exists and user is a member...
  // For now, we assume if they have the ID, they can create it.

  const task = await Task.create({
    title,
    description,
    project: projectId,
    priority: priority || 'Medium',
    status: status || 'To Do',
    reporter: req.user._id, // The logged-in user is the reporter
  });

  // Populate assignee/reporter details so we can show names on the frontend immediately
  const populatedTask = await Task.findById(task._id).populate('assignee', 'name avatar');

  res.status(201).json(populatedTask);
};

// @desc    Get all tasks for a specific project
// @route   GET /api/tasks/:projectId
// @access  Private
const getTasks = async (req, res) => {
  // Find all tasks where 'project' matches the ID in the URL
  const tasks = await Task.find({ project: req.params.projectId })
    .populate('assignee', 'name avatar') // Get assignee details
    .populate('reporter', 'name');       // Get reporter details

  res.json(tasks);
};

// @desc    Update task (used for moving columns or editing details)
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  const { title, description, status, priority, assignee } = req.body;
  
  // Find the task by ID
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  // Update fields if they are provided in the request
  task.title = title || task.title;
  task.description = description || task.description;
  task.status = status || task.status;
  task.priority = priority || task.priority;
  task.assignee = assignee || task.assignee;

  const updatedTask = await task.save();
  
  // Return the updated task with populated fields
  const populated = await Task.findById(updatedTask._id).populate('assignee', 'name avatar');

  res.json(populated);
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
        res.status(404);
        throw new Error('Task not found');
    }

    await task.deleteOne(); // Remove from DB
    res.json({ message: 'Task removed' });
}

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
const addComment = async (req, res) => {
  const { text } = req.body;
  const task = await Task.findById(req.params.id);

  if (task) {
    const comment = {
      text,
      user: req.user._id,
    };

    task.comments.push(comment);
    await task.save();
    
    // Return the updated task with populated comments
    const updatedTask = await Task.findById(req.params.id)
        .populate('comments.user', 'name avatar');

    res.status(201).json(updatedTask);
  } else {
    res.status(404);
    throw new Error('Task not found');
  }
};

module.exports = { createTask, getTasks, updateTask, deleteTask, addComment };
