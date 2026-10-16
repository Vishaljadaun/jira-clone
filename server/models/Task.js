const mongoose = require('mongoose');

const taskSchema = mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: String, default: null },
    
    // Status corresponds to the Kanban columns
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Done'], // Only allow these specific values
      default: 'To Do',
    },
    
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },

    // Link the task to a specific Project
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },

    // Who is responsible for this task?
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Who created the task?
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
comments: [
      {
        text: { type: String, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    
  },
  { timestamps: true, optimisticConcurrency: true }
);

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;