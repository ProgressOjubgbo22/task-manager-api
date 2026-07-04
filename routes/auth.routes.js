const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateVerifyEmail,
  validateLogout,
} = require("../validators/auth.validators");
const {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
} = require("../controllers/auth.controller");

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/logout", authenticate, validateLogout, logout);
router.post("/refresh-token", validateRefreshToken, refreshToken);
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/reset-password", validateResetPassword, resetPassword);
router.post("/change-password", authenticate, validateChangePassword, changePassword);
router.post("/verify-email", validateVerifyEmail, verifyEmail);

module.exports = router;
