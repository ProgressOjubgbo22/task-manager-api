const { verifyAccessToken } = require("../utils/jwt");
const User = require("../models/User");
const { errorResponse } = require("../utils/response");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, "No token provided", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select("-passwordHash -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires");
    if (!user) {
      return errorResponse(res, "User not found", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return errorResponse(res, "Token expired", 401);
    }
    return errorResponse(res, "Invalid token", 401);
  }
};

module.exports = { authenticate };
