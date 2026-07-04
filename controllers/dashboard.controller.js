const WorkspaceMember = require("../models/WorkspaceMember");
const Project = require("../models/Project");
const Task = require("../models/Task");
const ActivityLog = require("../models/ActivityLog");
const { successResponse, errorResponse } = require("../utils/response");

// GET /dashboard
const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all workspaces the user belongs to
    const memberships = await WorkspaceMember.find({ userId }).populate("workspaceId");
    const workspaceIds = memberships.map((m) => m.workspaceId._id);
    const totalWorkspaces = workspaceIds.length;

    // Get all projects in those workspaces
    const projects = await Project.find({ workspaceId: { $in: workspaceIds } });
    const projectIds = projects.map((p) => p._id);
    const totalProjects = projects.length;

    // Get all tasks in those projects
    const allTasks = await Task.find({ projectId: { $in: projectIds } });
    const totalTasks = allTasks.length;

    // Tasks assigned to the current user
    const myTasks = allTasks.filter((t) => t.assigneeId && t.assigneeId.toString() === userId.toString());

    // Task counts by status
    const tasksByStatus = {
      TODO: 0,
      IN_PROGRESS: 0,
      REVIEW: 0,
      DONE: 0,
    };
    allTasks.forEach((t) => { tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1; });

    const tasksCompleted = tasksByStatus.DONE;
    const pendingTasks = tasksByStatus.TODO + tasksByStatus.IN_PROGRESS + tasksByStatus.REVIEW;

    // Overdue tasks (not done and past due date)
    const now = new Date();
    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== "DONE"
    ).length;

    // Upcoming deadlines (next 7 days, not done)
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = await Task.find({
      projectId: { $in: projectIds },
      dueDate: { $gte: now, $lte: in7Days },
      status: { $ne: "DONE" },
    })
      .populate("assigneeId", "firstName lastName username profilePicture")
      .populate("projectId", "name")
      .sort({ dueDate: 1 })
      .limit(10);

    // Recent activity across all workspaces
    const recentActivity = await ActivityLog.find({ workspaceId: { $in: workspaceIds } })
      .populate("userId", "firstName lastName username profilePicture")
      .sort({ createdAt: -1 })
      .limit(10);

    // Team members across workspaces (unique)
    const allMemberDocs = await WorkspaceMember.find({ workspaceId: { $in: workspaceIds } })
      .populate("userId", "firstName lastName username profilePicture")
      .populate("workspaceId", "name");

    const uniqueMembers = {};
    allMemberDocs.forEach((m) => {
      if (m.userId && !uniqueMembers[m.userId._id]) {
        uniqueMembers[m.userId._id] = m.userId;
      }
    });
    const teamMembers = Object.values(uniqueMembers);

    return successResponse(res, {
      totalWorkspaces,
      totalProjects,
      totalTasks,
      myTasksCount: myTasks.length,
      tasksByStatus,
      tasksCompleted,
      pendingTasks,
      overdueTasks,
      upcomingDeadlines,
      recentActivity,
      teamMembersCount: teamMembers.length,
      teamMembers: teamMembers.slice(0, 10),
    });
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

module.exports = { getDashboard };
