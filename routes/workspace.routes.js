const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  validateCreateWorkspace,
  validateUpdateWorkspace,
  validateJoinWorkspace,
  validateInviteMember,
  validateUpdateMemberRole,
} = require("../validators/workspace.validators");
const {
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  joinWorkspace,
  leaveWorkspace,
  inviteMember,
  removeMember,
  getMembers,
  updateMemberRole,
  getActivityLogs,
} = require("../controllers/workspace.controller");

router.get("/", authenticate, getWorkspaces);
router.post("/", authenticate, validateCreateWorkspace, createWorkspace);
router.post("/join", authenticate, validateJoinWorkspace, joinWorkspace);

router.get("/:workspaceId", authenticate, getWorkspace);
router.patch("/:workspaceId", authenticate, validateUpdateWorkspace, updateWorkspace);
router.delete("/:workspaceId", authenticate, deleteWorkspace);
router.post("/:workspaceId/leave", authenticate, leaveWorkspace);
router.post("/:workspaceId/invite", authenticate, validateInviteMember, inviteMember);

router.get("/:workspaceId/members", authenticate, getMembers);
router.delete("/:workspaceId/members/:memberId", authenticate, removeMember);
router.patch("/:workspaceId/members/:memberId/role", authenticate, validateUpdateMemberRole, updateMemberRole);

router.get("/:workspaceId/activity-logs", authenticate, getActivityLogs);

module.exports = router;
