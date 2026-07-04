const { z } = require("zod");
const { validate } = require("./auth.validators");

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

const joinWorkspaceSchema = z.object({
  inviteCode: z.string().min(1),
});

const inviteMemberSchema = z.object({
  userId: z.string().min(1),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

module.exports = {
  validateCreateWorkspace: validate(createWorkspaceSchema),
  validateUpdateWorkspace: validate(updateWorkspaceSchema),
  validateJoinWorkspace: validate(joinWorkspaceSchema),
  validateInviteMember: validate(inviteMemberSchema),
  validateUpdateMemberRole: validate(updateMemberRoleSchema),
};
