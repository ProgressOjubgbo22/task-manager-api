const bcrypt = require("bcryptjs");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const Workspace = require("../models/Workspace");
const WorkspaceMember = require("../models/WorkspaceMember");
const cloudinary = require("../config/cloudinary");
const { successResponse, errorResponse } = require("../utils/response");
const streamifier = require("streamifier");

// GET /users/me
const getProfile = async (req, res) => {
  try {
    return successResponse(res, { user: req.user }, "Profile retrieved");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// PATCH /users/me
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, username } = req.body;
    const user = await User.findById(req.user._id);

    if (username && username !== user.username) {
      const conflict = await User.findOne({ username });
      if (conflict) return errorResponse(res, "Username already taken", 409);
      user.username = username;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    await user.save();
    return successResponse(res, { user: user.toPublicJSON() }, "Profile updated");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// DELETE /users/me
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id);

    const bcrypt = require("bcryptjs");
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return errorResponse(res, "Incorrect password", 400);

    await RefreshToken.deleteMany({ userId: user._id });
    await WorkspaceMember.deleteMany({ userId: user._id });

    // Transfer or delete owned workspaces
    const ownedWorkspaces = await Workspace.find({ ownerId: user._id });
    for (const ws of ownedWorkspaces) {
      const nextAdmin = await WorkspaceMember.findOne({ workspaceId: ws._id, userId: { $ne: user._id }, role: { $in: ["ADMIN", "MEMBER"] } });
      if (nextAdmin) {
        ws.ownerId = nextAdmin.userId;
        nextAdmin.role = "OWNER";
        await ws.save();
        await nextAdmin.save();
      } else {
        await Workspace.deleteOne({ _id: ws._id });
      }
    }

    await User.deleteOne({ _id: user._id });
    return successResponse(res, {}, "Account deleted successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /users/me/avatar
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return errorResponse(res, "No file uploaded", 400);

    const uploadFromBuffer = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "task-manager/avatars", resource_type: "image", transformation: [{ width: 200, height: 200, crop: "fill" }] },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

    const result = await uploadFromBuffer();
    const user = await User.findById(req.user._id);
    user.profilePicture = result.secure_url;
    await user.save();

    return successResponse(res, { user: user.toPublicJSON() }, "Avatar uploaded");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// GET /users/search
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return errorResponse(res, "Search query must be at least 2 characters", 400);

    const regex = new RegExp(q.trim(), "i");
    const users = await User.find({
      $or: [{ username: regex }, { email: regex }, { firstName: regex }, { lastName: regex }],
    }).select("_id firstName lastName username email profilePicture isVerified").limit(20);

    return successResponse(res, { users }, "Users found");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

module.exports = { getProfile, updateProfile, deleteAccount, uploadAvatar, searchUsers };