const { errorResponse } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return errorResponse(res, "Validation error", 400, messages);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return errorResponse(res, `${field} already exists`, 409);
  }

  if (err.name === "CastError") {
    return errorResponse(res, "Invalid ID format", 400);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  return errorResponse(res, message, statusCode);
};

const notFound = (req, res) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404);
};

module.exports = { errorHandler, notFound };
