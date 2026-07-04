const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { validateCreateProject, validateUpdateProject, validateCreateTask, validateUpdateTask } = require("../validators/project.validators");
const { getProject, updateProject, deleteProject } = require("../controllers/project.controller");
const { getTasks, createTask } = require("../controllers/task.controller");

router.get("/:projectId", authenticate, getProject);
router.patch("/:projectId", authenticate, validateUpdateProject, updateProject);
router.delete("/:projectId", authenticate, deleteProject);

// // Tasks nested under project
router.get("/:projectId/tasks", authenticate, getTasks);
router.post("/:projectId/tasks", authenticate, validateCreateTask, createTask);

module.exports = router;
