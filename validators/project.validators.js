const { z } = require("zod");
const { validate } = require("./auth.validators");

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

module.exports = {
  validateCreateProject: validate(createProjectSchema),
  validateUpdateProject: validate(updateProjectSchema),
  validateCreateTask: validate(createTaskSchema),
  validateUpdateTask: validate(updateTaskSchema),
  validateCreateComment: validate(createCommentSchema),
  validateUpdateComment: validate(updateCommentSchema),
  validateUpdateProfile: validate(updateProfileSchema),
  validateDeleteAccount: validate(deleteAccountSchema),
};
