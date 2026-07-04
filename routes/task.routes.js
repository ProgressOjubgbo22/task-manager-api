const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { validateUpdateTask, validateCreateComment, validateUpdateComment } = require("../validators/project.validators");
const { getTask, updateTask, deleteTask } = require("../controllers/task.controller");
const { getComments, createComment } = require("../controllers/comment.controller");

router.get("/:taskId", authenticate, getTask);
router.patch("/:taskId", authenticate, validateUpdateTask, updateTask);
router.delete("/:taskId", authenticate, deleteTask);

// // Comments nested under task
router.get("/:taskId/comments", authenticate, getComments);
router.post("/:taskId/comments", authenticate, validateCreateComment, createComment);

module.exports = router;
