const { v4: uuidv4 } = require("uuid");
const Workspace = require("../models/Workspace");
const WorkspaceMember = require("../models/WorkspaceMember");
const Project = require("../models/Project");
const Task = require("../models/Task");
const Comment = require("../models/Comment");
const ActivityLog = require("../models/ActivityLog");
const { logActivity } = require("../utils/activityLogger");
const { successResponse, errorResponse } = require("../utils/response");

// GET /workspaces
const getWorkspaces = async (req, res) => {
  try {
    const memberships = await WorkspaceMember.find({ userId: req.user._id }).populate("workspaceId");
    const workspaces = memberships.map((m) => ({ ...m.workspaceId.toObject(), role: m.role }));
    return successResponse(res, { workspaces });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// GET /workspaces/:workspaceId
const getWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return errorResponse(res, "Workspace not found", 404);

    const member = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId: req.user._id });
    if (!member) return errorResponse(res, "Access denied", 403);

    return successResponse(res, { workspace, role: member.role });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /workspaces
const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    const inviteCode = uuidv4().slice(0, 8).toUpperCase();

    const workspace = await Workspace.create({ name, description, inviteCode, ownerId: req.user._id });
    await WorkspaceMember.create({ workspaceId: workspace._id, userId: req.user._id, role: "OWNER" });

    return successResponse(res, { workspace }, "Workspace created", 201);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// PATCH /workspaces/:workspaceId
const updateWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return errorResponse(res, "Workspace not found", 404);

    const member = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId: req.user._id });
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) return errorResponse(res, "Access denied", 403);

    const { name, description } = req.body;
    if (name !== undefined) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    await workspace.save();

    await logActivity({ workspaceId: workspace._id, userId: req.user._id, action: "UPDATED", entityType: "WORKSPACE", entityId: workspace._id });

    return successResponse(res, { workspace }, "Workspace updated");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// DELETE /workspaces/:workspaceId
const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return errorResponse(res, "Workspace not found", 404);
    if (workspace.ownerId.toString() !== req.user._id.toString()) return errorResponse(res, "Only the owner can delete a workspace", 403);

    const projects = await Project.find({ workspaceId: workspace._id });
    const projectIds = projects.map((p) => p._id);
    const tasks = await Task.find({ projectId: { $in: projectIds } });
    const taskIds = tasks.map((t) => t._id);

    await Comment.deleteMany({ taskId: { $in: taskIds } });
    await Task.deleteMany({ projectId: { $in: projectIds } });
    await Project.deleteMany({ workspaceId: workspace._id });
    await WorkspaceMember.deleteMany({ workspaceId: workspace._id });
    await ActivityLog.deleteMany({ workspaceId: workspace._id });
    await Workspace.deleteOne({ _id: workspace._id });

    return successResponse(res, {}, "Workspace deleted");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /workspaces/join
const joinWorkspace = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const workspace = await Workspace.findOne({ inviteCode });
    if (!workspace) return errorResponse(res, "Invalid invite code", 404);

    const existing = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId: req.user._id });
    if (existing) return errorResponse(res, "You are already a member of this workspace", 409);

    const member = await WorkspaceMember.create({ workspaceId: workspace._id, userId: req.user._id, role: "MEMBER" });
    await logActivity({ workspaceId: workspace._id, userId: req.user._id, action: "JOINED", entityType: "MEMBER", entityId: req.user._id, metadata: { username: req.user.username } });

    return successResponse(res, { workspace, role: member.role }, "Joined workspace", 201);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /workspaces/:workspaceId/leave
const leaveWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return errorResponse(res, "Workspace not found", 404);

    const member = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId: req.user._id });
    if (!member) return errorResponse(res, "You are not a member of this workspace", 404);
    if (workspace.ownerId.toString() === req.user._id.toString()) return errorResponse(res, "Owner cannot leave. Transfer ownership or delete the workspace.", 400);

    await WorkspaceMember.deleteOne({ _id: member._id });
    await logActivity({ workspaceId: workspace._id, userId: req.user._id, action: "LEFT", entityType: "MEMBER", entityId: req.user._id });

    return successResponse(res, {}, "Left workspace");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /workspaces/:workspaceId/invite
const inviteMember = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return errorResponse(res, "Workspace not found", 404);

    const requester = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId: req.user._id });
    if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) return errorResponse(res, "Access denied", 403);

    const { userId } = req.body;
    const User = require("../models/User");
    const invitedUser = await User.findById(userId);
    if (!invitedUser) return errorResponse(res, "User not found", 404);

    const existing = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId });
    if (existing) return errorResponse(res, "User is already a member", 409);

    await WorkspaceMember.create({ workspaceId: workspace._id, userId, role: "MEMBER" });
    await logActivity({ workspaceId: workspace._id, userId: req.user._id, action: "INVITED", entityType: "MEMBER", entityId: userId, metadata: { invitedUser: invitedUser.username } });

    return successResponse(res, {}, "Member invited", 201);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// DELETE /workspaces/:workspaceId/members/:memberId
const removeMember = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return errorResponse(res, "Workspace not found", 404);

    const requester = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId: req.user._id });
    if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) return errorResponse(res, "Access denied", 403);

    const target = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId: req.params.memberId });
    if (!target) return errorResponse(res, "Member not found", 404);
    if (target.role === "OWNER") return errorResponse(res, "Cannot remove the owner", 400);

    await WorkspaceMember.deleteOne({ _id: target._id });
    await logActivity({ workspaceId: workspace._id, userId: req.user._id, action: "REMOVED", entityType: "MEMBER", entityId: req.params.memberId });

    return successResponse(res, {}, "Member removed");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// GET /workspaces/:workspaceId/members
const getMembers = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return errorResponse(res, "Workspace not found", 404);

    const member = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId: req.user._id });
    if (!member) return errorResponse(res, "Access denied", 403);

    const members = await WorkspaceMember.find({ workspaceId: workspace._id }).populate("userId", "firstName lastName username email profilePicture isVerified");
    return successResponse(res, { members });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// PATCH /workspaces/:workspaceId/members/:memberId/role
const updateMemberRole = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return errorResponse(res, "Workspace not found", 404);

    const requester = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId: req.user._id });
    if (!requester || requester.role !== "OWNER") return errorResponse(res, "Only the owner can change roles", 403);

    const target = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId: req.params.memberId });
    if (!target) return errorResponse(res, "Member not found", 404);
    if (target.role === "OWNER") return errorResponse(res, "Cannot change owner role", 400);

    target.role = req.body.role;
    await target.save();
    await logActivity({ workspaceId: workspace._id, userId: req.user._id, action: "UPDATED", entityType: "MEMBER", entityId: req.params.memberId, metadata: { newRole: req.body.role } });

    return successResponse(res, { member: target }, "Role updated");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// GET /workspaces/:workspaceId/activity-logs
const getActivityLogs = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return errorResponse(res, "Workspace not found", 404);

    const member = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId: req.user._id });
    if (!member) return errorResponse(res, "Access denied", 403);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find({ workspaceId: workspace._id })
      .populate("userId", "firstName lastName username profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments({ workspaceId: workspace._id });

    return successResponse(res, { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

module.exports = { getWorkspaces, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace, joinWorkspace, leaveWorkspace, inviteMember, removeMember, getMembers, updateMemberRole, getActivityLogs };

