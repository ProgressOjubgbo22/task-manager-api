const Comment = require("../models/Comment");
const Task = require("../models/Task");
const Project = require("../models/Project");
const WorkspaceMember = require("../models/WorkspaceMember");
const { logActivity } = require("../utils/activityLogger");
const { successResponse, errorResponse } = require("../utils/response");

const getWorkspaceAndMember = async (taskId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) return { error: "Task not found" };
  const project = await Project.findById(task.projectId);
  if (!project) return { error: "Project not found" };
  const member = await WorkspaceMember.findOne({ workspaceId: project.workspaceId, userId });
  return { task, project, member };
};

// GET /tasks/:taskId/comments
const getComments = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return errorResponse(res, "Task not found", 404);

    const project = await Project.findById(task.projectId);
    const member = await WorkspaceMember.findOne({ workspaceId: project.workspaceId, userId: req.user._id });
    if (!member) return errorResponse(res, "Access denied", 403);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ taskId: task._id })
      .populate("userId", "firstName lastName username profilePicture")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Comment.countDocuments({ taskId: task._id });

    return successResponse(res, { comments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /tasks/:taskId/comments
const createComment = async (req, res) => {
  try {
    const { task, project, member, error } = await getWorkspaceAndMember(req.params.taskId, req.user._id);
    if (error) return errorResponse(res, error, 404);
    if (!member) return errorResponse(res, "Access denied", 403);

    const comment = await Comment.create({
      taskId: task._id,
      userId: req.user._id,
      content: req.body.content,
    });

    await logActivity({
      workspaceId: project.workspaceId,
      userId: req.user._id,
      action: "COMMENTED",
      entityType: "COMMENT",
      entityId: comment._id,
      metadata: { taskId: task._id, taskTitle: task.title },
    });

    const populated = await Comment.findById(comment._id).populate("userId", "firstName lastName username profilePicture");
    return successResponse(res, { comment: populated }, "Comment added", 201);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// PATCH /comments/:commentId
const updateComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return errorResponse(res, "Comment not found", 404);

    if (comment.userId.toString() !== req.user._id.toString()) {
      return errorResponse(res, "You can only edit your own comments", 403);
    }

    comment.content = req.body.content;
    await comment.save();

    const task = await Task.findById(comment.taskId);
    const project = await Project.findById(task.projectId);

    await logActivity({
      workspaceId: project.workspaceId,
      userId: req.user._id,
      action: "UPDATED",
      entityType: "COMMENT",
      entityId: comment._id,
    });

    const populated = await Comment.findById(comment._id).populate("userId", "firstName lastName username profilePicture");
    return successResponse(res, { comment: populated }, "Comment updated");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// DELETE /comments/:commentId
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return errorResponse(res, "Comment not found", 404);

    const task = await Task.findById(comment.taskId);
    const project = await Project.findById(task.projectId);
    const member = await WorkspaceMember.findOne({ workspaceId: project.workspaceId, userId: req.user._id });
    if (!member) return errorResponse(res, "Access denied", 403);

    const isAuthor = comment.userId.toString() === req.user._id.toString();
    const isPrivileged = ["OWNER", "ADMIN"].includes(member.role);
    if (!isAuthor && !isPrivileged) return errorResponse(res, "Insufficient permissions", 403);

    await logActivity({
      workspaceId: project.workspaceId,
      userId: req.user._id,
      action: "DELETED",
      entityType: "COMMENT",
      entityId: comment._id,
    });

    await Comment.deleteOne({ _id: comment._id });
    return successResponse(res, {}, "Comment deleted");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

module.exports = { getComments, createComment, updateComment, deleteComment };
