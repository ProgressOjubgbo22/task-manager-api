const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const workspaceRoutes = require("./routes/workspace.routes");
const projectRoutes = require("./routes/project.routes");
const projectStandaloneRoutes = require("./routes/projectStandalone.routes");
const taskRoutes = require("./routes/task.routes");
const commentRoutes = require("./routes/comment.routes");
// const dashboardRoutes = require("./routes/dashboard.routes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: "Too many requests, please try again later." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many auth attempts, please try again later." },
});
app.use("/api/", limiter);
app.use("/api/auth/", authLimiter);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// // Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces/:workspaceId/projects", projectRoutes);
app.use("/api/projects", projectStandaloneRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
// app.use("/api/dashboard", dashboardRoutes);

// // Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
