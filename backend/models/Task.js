const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Review', 'Done'],
      default: 'To Do',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    deadline: {
      type: Date,
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
    },
    moduleName: {
      type: String,
      default: '',
    },

    source: {
      type: {
        type: String,
        enum: ['canvas'],
      },
      courseId: {
        type: String,
        default: '',
      },
      assignmentId: {
        type: String,
        default: '',
      },
    },
    timeSpent: {
      type: Number,
      default: 0, // in minutes
    },
    subtasks: [
      {
        text: String,
        completed: { type: Boolean, default: false },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },

    unlockAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

taskSchema.index(
  { userId: 1, 'source.type': 1, 'source.courseId': 1, 'source.assignmentId': 1 },
  { unique: true, sparse: true }
)

module.exports = mongoose.model('Task', taskSchema);
