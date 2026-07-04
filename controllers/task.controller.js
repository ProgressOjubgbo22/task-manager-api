const Task = require("../models/Task");
const Project = require("../models/Project");
const WorkspaceMember = require("../models/WorkspaceMember");
const Comment = require("../models/Comment");
const { TaskTag } = require("../models/Tag");
const User = require("../models/User");
const { logActivity } = require("../utils/activityLogger");
const { successResponse, errorResponse } = require("../utils/response");

const getMember = async (workspaceId, userId) => {
  return WorkspaceMember.findOne({ workspaceId, userId });
};

// GET /projects/:projectId/tasks
const getTasks = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return errorResponse(res, "Project not found", 404);

    const member = await getMember(project.workspaceId, req.user._id);
    if (!member) return errorResponse(res, "Access denied", 403);

    const { status, priority, assigneeId, page = 1, limit = 20 } = req.query;
    const filter = { projectId: project._id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assigneeId) filter.assigneeId = assigneeId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const tasks = await Task.find(filter)
      .populate("assigneeId", "firstName lastName username profilePicture")
      .populate("reporterId", "firstName lastName username profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(filter);

    return successResponse(res, { tasks, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /projects/:projectId/tasks
const createTask = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return errorResponse(res, "Project not found", 404);

    const member = await getMember(project.workspaceId, req.user._id);
    if (!member) return errorResponse(res, "Access denied", 403);

    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    if (assigneeId) {
      const assigneeMember = await getMember(project.workspaceId, assigneeId);
      if (!assigneeMember) return errorResponse(res, "Assignee is not a workspace member", 400);
    }

    const task = await Task.create({
      projectId: project._id,
      title,
      description,
      status: status || "TODO",
      priority: priority || "MEDIUM",
      dueDate: dueDate || null,
      assigneeId: assigneeId || null,
      reporterId: req.user._id,
    });

    await logActivity({
      workspaceId: project.workspaceId,
      userId: req.user._id,
      action: "CREATED",
      entityType: "TASK",
      entityId: task._id,
      metadata: { taskTitle: title, projectId: project._id },
    });

    if (assigneeId) {
      await logActivity({
        workspaceId: project.workspaceId,
        userId: req.user._id,
        action: "ASSIGNED",
        entityType: "TASK",
        entityId: task._id,
        metadata: { assigneeId, taskTitle: title },
      });
    }

    const populated = await Task.findById(task._id)
      .populate("assigneeId", "firstName lastName username profilePicture")
      .populate("reporterId", "firstName lastName username profilePicture");

    return successResponse(res, { task: populated }, "Task created", 201);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// GET /tasks/:taskId
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate("assigneeId", "firstName lastName username profilePicture")
      .populate("reporterId", "firstName lastName username profilePicture");
    if (!task) return errorResponse(res, "Task not found", 404);

    const project = await Project.findById(task.projectId);
    const member = await getMember(project.workspaceId, req.user._id);
    if (!member) return errorResponse(res, "Access denied", 403);

    return successResponse(res, { task });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// PATCH /tasks/:taskId
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return errorResponse(res, "Task not found", 404);

    const project = await Project.findById(task.projectId);
    const member = await getMember(project.workspaceId, req.user._id);
    if (!member) return errorResponse(res, "Access denied", 403);

    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    if (assigneeId !== undefined && assigneeId !== null) {
      const assigneeMember = await getMember(project.workspaceId, assigneeId);
      if (!assigneeMember) return errorResponse(res, "Assignee is not a workspace member", 400);
    }

    const oldStatus = task.status;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assigneeId !== undefined) task.assigneeId = assigneeId;
    await task.save();

    const action = status && status !== oldStatus ? "STATUS_CHANGED" : "UPDATED";
    await logActivity({
      workspaceId: project.workspaceId,
      userId: req.user._id,
      action,
      entityType: "TASK",
      entityId: task._id,
      metadata: { taskTitle: task.title, ...(action === "STATUS_CHANGED" ? { from: oldStatus, to: status } : {}) },
    });

    if (assigneeId !== undefined && assigneeId !== null) {
      await logActivity({
        workspaceId: project.workspaceId,
        userId: req.user._id,
        action: "ASSIGNED",
        entityType: "TASK",
        entityId: task._id,
        metadata: { assigneeId },
      });
    }

    const populated = await Task.findById(task._id)
      .populate("assigneeId", "firstName lastName username profilePicture")
      .populate("reporterId", "firstName lastName username profilePicture");

    return successResponse(res, { task: populated }, "Task updated");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// DELETE /tasks/:taskId
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return errorResponse(res, "Task not found", 404);

    const project = await Project.findById(task.projectId);
    const member = await getMember(project.workspaceId, req.user._id);
    if (!member) return errorResponse(res, "Access denied", 403);

    // Only reporter, OWNER, or ADMIN can delete
    const isReporter = task.reporterId.toString() === req.user._id.toString();
    if (!isReporter && !["OWNER", "ADMIN"].includes(member.role)) {
      return errorResponse(res, "Insufficient permissions", 403);
    }

    await Comment.deleteMany({ taskId: task._id });
    await TaskTag.deleteMany({ taskId: task._id });

    await logActivity({
      workspaceId: project.workspaceId,
      userId: req.user._id,
      action: "DELETED",
      entityType: "TASK",
      entityId: task._id,
      metadata: { taskTitle: task.title },
    });

    await Task.deleteOne({ _id: task._id });

    return successResponse(res, {}, "Task deleted");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

module.exports = { getTasks, createTask, getTask, updateTask, deleteTask };
