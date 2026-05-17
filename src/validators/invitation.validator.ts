const { z } = require("zod");

const inviteRoleSchema = z.enum(["admin", "company-admin", "staff"]);

const createInvitationSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  role: inviteRoleSchema,
  // For admin inviter this may be required depending on target role.
  // For company-admin inviter this value is ignored and req.user.company is used.
  company: z.string().trim().optional(),
});

const acceptInvitationSchema = z.object({
  token: z.string().trim().min(1, "Invitation token is required"),
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

module.exports = {
  inviteRoleSchema,
  createInvitationSchema,
  acceptInvitationSchema,
};
