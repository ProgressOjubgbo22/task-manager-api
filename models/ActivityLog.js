const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: {
    type: String,
    enum: ["CREATED", "UPDATED", "DELETED", "ASSIGNED", "COMMENTED", "INVITED", "REMOVED", "STATUS_CHANGED", "JOINED", "LEFT"],
    required: true,
  },
  entityType: {
    type: String,
    enum: ["WORKSPACE", "PROJECT", "TASK", "COMMENT", "MEMBER"],
    required: true,
  },
  entityId: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ActivityLog", activityLogSchema);
