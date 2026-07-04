const express = require("express");
const router = express.Router({ mergeParams: true });
const { authenticate } = require("../middleware/auth");
const { validateCreateProject, validateUpdateProject } = require("../validators/project.validators");
const { getProjects, createProject, getProject, updateProject, deleteProject } = require("../controllers/project.controller");

// Nested under /workspaces/:workspaceId/projects
router.get("/", authenticate, getProjects);
router.post("/", authenticate, validateCreateProject, createProject);

module.exports = router;
