const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { validateUpdateProfile, validateDeleteAccount } = require("../validators/project.validators");
const upload = require("../utils/upload");
const { getProfile, updateProfile, deleteAccount, uploadAvatar, searchUsers } = require("../controllers/user.controller");

router.get("/me", authenticate, getProfile);
router.patch("/me", authenticate, validateUpdateProfile, updateProfile);
router.delete("/me", authenticate, validateDeleteAccount, deleteAccount);
router.post("/me/avatar", authenticate, upload.single("avatar"), uploadAvatar);
router.get("/search", authenticate, searchUsers);

module.exports = router;
