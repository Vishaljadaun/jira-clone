const mongoose = require('mongoose');

const projectSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    // The "Owner" is the Admin of this specific project
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Connects to the User model
      required: true,
    },
    // "Members" are the people invited to work on this project
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;