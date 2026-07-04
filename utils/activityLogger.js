const ActivityLog = require("../models/ActivityLog");

const logActivity = async ({ workspaceId, userId, action, entityType, entityId, metadata = null }) => {
  try {
    await ActivityLog.create({ workspaceId, userId, action, entityType, entityId: entityId.toString(), metadata });
  } catch (err) {
    console.error("Failed to log activity:", err.message);
  }
};

module.exports = { logActivity };
