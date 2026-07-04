const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/email");
const { successResponse, errorResponse } = require("../utils/response");

const saveRefreshToken = async (userId, token) => {
  const decoded = verifyRefreshToken(token);
  await RefreshToken.create({
    token,
    userId,
    expiresAt: new Date(decoded.exp * 1000),
  });
};

// POST /auth/register
const register = async (req, res) => {
  try {
    const { firstName, lastName, username, email, password } = req.body;

    const emailExists = await User.findOne({ email });
    if (emailExists) return errorResponse(res, "Email already in use", 409);

    const usernameExists = await User.findOne({ username });
    if (usernameExists) return errorResponse(res, "Username already taken", 409);

    const passwordHash = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedVerificationToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      passwordHash,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await saveRefreshToken(user._id, refreshToken);

    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (e) {
      console.error("Email send failed:", e.message);
    }

    return successResponse(res, { user: user.toPublicJSON(), accessToken, refreshToken }, "Registration successful", 201);
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return errorResponse(res, "Invalid email or password", 401);

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return errorResponse(res, "Invalid email or password", 401);

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await saveRefreshToken(user._id, refreshToken);

    return successResponse(res, { user: user.toPublicJSON(), accessToken, refreshToken }, "Login successful");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /auth/logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc) return errorResponse(res, "Token not found", 404);

    if (tokenDoc.userId.toString() !== req.user._id.toString()) {
      return errorResponse(res, "Unauthorized", 403);
    }

    await RefreshToken.deleteOne({ _id: tokenDoc._id });
    return successResponse(res, {}, "Logged out successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /auth/refresh-token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    const tokenDoc = await RefreshToken.findOne({ token });
    if (!tokenDoc) return errorResponse(res, "Invalid refresh token", 401);
    if (tokenDoc.revoked) return errorResponse(res, "Token has been revoked", 401);
    if (tokenDoc.expiresAt < new Date()) return errorResponse(res, "Token has expired", 401);

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) return errorResponse(res, "User not found", 401);

    const accessToken = generateAccessToken(user._id);
    return successResponse(res, { accessToken }, "Token refreshed");
  } catch (err) {
    return errorResponse(res, "Invalid token", 401);
  }
};

// POST /auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      try {
        await sendPasswordResetEmail(email, resetToken);
      } catch (e) {
        console.error("Email send failed:", e.message);
      }
    }

    return successResponse(res, {}, "If an account with that email exists, a reset link has been sent.");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) return errorResponse(res, "Invalid or expired reset token", 400);

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    await RefreshToken.deleteMany({ userId: user._id });

    return successResponse(res, {}, "Password reset successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return errorResponse(res, "Current password is incorrect", 400);

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    await RefreshToken.deleteMany({ userId: user._id });

    return successResponse(res, {}, "Password changed successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

// POST /auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) return errorResponse(res, "Invalid or expired verification token", 400);

    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return successResponse(res, {}, "Email verified successfully");
  } catch (err) {
    return errorResponse(res, err.message, 500);
  }
};

module.exports = { register, login, logout, refreshToken, forgotPassword, resetPassword, changePassword, verifyEmail };
