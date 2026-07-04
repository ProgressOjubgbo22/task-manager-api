const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    status: { type: String, enum: ["TODO", "IN_PROGRESS", "REVIEW", "DONE"], default: "TODO" },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM" },
    dueDate: { type: Date, default: null },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
