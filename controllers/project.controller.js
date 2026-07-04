const Project = require("../models/Project");
const Workspace = require("../models/Workspace");
const WorkspaceMember = require("../models/WorkspaceMember");
const Task = require("../models/Task");
const Comment = require("../models/Comment");
const { TaskTag } = require("../models/Tag");
const { logActivity } = require("../utils/activityLogger");
const { successResponse, errorResponse } = require("../utils/response");

const getMemberRole = async (workspaceId, userId) => {
  const member = await WorkspaceMember.findOne({ workspaceId, userId });
  return member ? member.role : null;
};

// GET /workspaces/:workspaceId/projects
const getProjects = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return errorResponse(res, "Workspace not found", 404);

    const role = await getMemberRole(workspace._id, req.user._id);
    if (!role) return errorResponse(res, "Access denied", 403);

    const projects = await Project.find({ workspaceId: workspace._id })
      .populate("createdBy", "firstName lastName username profilePicture")
      .sort({ createdAt: -1 });

    return successResponse(res, { projects });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /workspaces/:workspaceId/projects
const createProject = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return errorResponse(res, "Workspace not found", 404);

    const role = await getMemberRole(workspace._id, req.user._id);
    if (!role) return errorResponse(res, "Access denied", 403);

    const { name, description } = req.body;
    const project = await Project.create({
      workspaceId: workspace._id,
      name,
      description,
      createdBy: req.user._id,
      status: "ACTIVE",
    });

    await logActivity({
      workspaceId: workspace._id,
      userId: req.user._id,
      action: "CREATED",
      entityType: "PROJECT",
      entityId: project._id,
      metadata: { projectName: name },
    });

    return successResponse(res, { project }, "Project created", 201);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// GET /projects/:projectId
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate("createdBy", "firstName lastName username profilePicture");
    if (!project) return errorResponse(res, "Project not found", 404);

    const role = await getMemberRole(project.workspaceId, req.user._id);
    if (!role) return errorResponse(res, "Access denied", 403);

    return successResponse(res, { project, role });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// PATCH /projects/:projectId
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return errorResponse(res, "Project not found", 404);

    const role = await getMemberRole(project.workspaceId, req.user._id);
    if (!role) return errorResponse(res, "Access denied", 403);
    if (!["OWNER", "ADMIN"].includes(role)) return errorResponse(res, "Insufficient permissions", 403);

    const { name, description, status } = req.body;
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;
    await project.save();

    await logActivity({
      workspaceId: project.workspaceId,
      userId: req.user._id,
      action: "UPDATED",
      entityType: "PROJECT",
      entityId: project._id,
      metadata: { projectName: project.name },
    });

    return successResponse(res, { project }, "Project updated");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// DELETE /projects/:projectId
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return errorResponse(res, "Project not found", 404);

    const role = await getMemberRole(project.workspaceId, req.user._id);
    if (!role) return errorResponse(res, "Access denied", 403);
    if (!["OWNER", "ADMIN"].includes(role)) return errorResponse(res, "Insufficient permissions", 403);

    const tasks = await Task.find({ projectId: project._id });
    const taskIds = tasks.map((t) => t._id);

    await Comment.deleteMany({ taskId: { $in: taskIds } });
    await TaskTag.deleteMany({ taskId: { $in: taskIds } });
    await Task.deleteMany({ projectId: project._id });

    await logActivity({
      workspaceId: project.workspaceId,
      userId: req.user._id,
      action: "DELETED",
      entityType: "PROJECT",
      entityId: project._id,
      metadata: { projectName: project.name },
    });

    await Project.deleteOne({ _id: project._id });

    return successResponse(res, {}, "Project deleted");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject };