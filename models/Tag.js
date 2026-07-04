const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true, default: "#6366f1" },
  },
  { timestamps: true }
);

const taskTagSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  tagId: { type: mongoose.Schema.Types.ObjectId, ref: "Tag", required: true },
  createdAt: { type: Date, default: Date.now },
});

taskTagSchema.index({ taskId: 1, tagId: 1 }, { unique: true });

const Tag = mongoose.model("Tag", tagSchema);
const TaskTag = mongoose.model("TaskTag", taskTagSchema);

module.exports = { Tag, TaskTag };
