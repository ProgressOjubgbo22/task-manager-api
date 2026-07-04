const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { validateUpdateComment } = require("../validators/project.validators");
const { updateComment, deleteComment } = require("../controllers/comment.controller");

router.patch("/:commentId", authenticate, validateUpdateComment, updateComment);
router.delete("/:commentId", authenticate, deleteComment);

module.exports = router;
