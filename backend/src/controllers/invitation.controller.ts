import { Request, Response } from "express";

import * as crypto from "crypto";
import mongoose from "mongoose";

import Invitation from "../models/Invitation";
import User from "../models/User";

import { getMailClient } from "../config/email";
import { env } from "../config/env";
import { hashPassword } from "../utils/hash";
import { apiResponse } from "../utils/apiResponse";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { createInvitationSchema, acceptInvitationSchema } from "../validators/invitation.validator";
import { getAllowedInviteRoles, canInviteRole } from "../utils/invitationRole";

type UserRole = "admin" | "company-admin" | "staff";

type AuthenticatedUser = {
  _id: string;
  email: string;
  role: UserRole;
  company: string | null;
};

const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const hashInvitationToken = (rawToken: string): string => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

const getInviterFromRequest = (req: Request): AuthenticatedUser => {
  const inviter = (req as any).user as AuthenticatedUser | undefined;

  if (!inviter || !inviter._id || !inviter.role) {
    throw new AppError("Not authorized to send invitations", 401);
  }

  return inviter;
};

const resolveInvitationCompany = (
  inviter: AuthenticatedUser,
  targetRole: UserRole,
  requestedCompany?: string
): string | null => {
  if (inviter.role === "staff") {
    throw new AppError("Staff users are not allowed to send invitations", 403);
  }

  if (inviter.role === "admin") {
    if (targetRole === "admin") {
      return null;
    }

    if (!requestedCompany) {
      throw new AppError(
        "company is required when inviting company-admin or staff",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(requestedCompany)) {
      throw new AppError("company must be a valid ObjectId", 400);
    }

    return requestedCompany;
  }

  // company-admin inviter: never trust req.body.company, always inherit req.user.company.
  if (inviter.role === "company-admin") {
    if (!inviter.company) {
      throw new AppError("Inviter company context is missing", 400);
    }

    return inviter.company;
  }

  throw new AppError("Invalid inviter role", 403);
};

const sendInvitationEmail = async (
  email: string,
  role: UserRole,
  invitationLink: string,
  expiresAt: Date
) => {
  const { transporter, fromAddress } = await getMailClient();

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: "You're invited to Customer Support SaaS",
    html: `
      <p>You have been invited with role: <strong>${role}</strong>.</p>
      <p>Complete your account setup using the link below:</p>
      <p><a href="${invitationLink}">${invitationLink}</a></p>
      <p>This link expires at: ${expiresAt.toISOString()}</p>
    `,
  });
};

const createInvitation = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const inviter = getInviterFromRequest(req);

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const targetRole = parsed.data.role as UserRole;
  const requestedCompany = parsed.data.company;

  const allowedRoles = getAllowedInviteRoles(inviter.role);
  if (!canInviteRole(inviter.role, targetRole)) {
    throw new AppError(
      `You are not allowed to invite role '${targetRole}'. Allowed roles: ${
        allowedRoles.join(", ") || "none"
      }`,
      403
    );
  }

  const assignedCompany = resolveInvitationCompany(
    inviter,
    targetRole,
    requestedCompany
  );

  const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");
  if (existingUser) {
    throw new AppError("A user with this email already exists", 409);
  }

  const now = new Date();
  // Revoke previous active invitations for the same email to keep a single active link.
  await Invitation.updateMany(
    {
      email: normalizedEmail,
      revokedAt: null,
      usedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: { revokedAt: now },
    }
  );

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);

  const invitation = await Invitation.create({
    email: normalizedEmail,
    role: targetRole,
    company: assignedCompany,
    tokenHash,
    invitedBy: inviter._id,
    expiresAt,
  });

  const invitationLink = `${env.frontend.url}/accept-invitation?token=${rawToken}`;

  try {
    await sendInvitationEmail(normalizedEmail, targetRole, invitationLink, expiresAt);
  } catch (error) {
    invitation.revokedAt = new Date();
    await invitation.save();

    throw new AppError(
      "Failed to send invitation email. Check SMTP configuration and try again.",
      502
    );
  }

  apiResponse(res, 201, "Invitation sent successfully", {
    invitationId: String(invitation._id),
    email: invitation.email,
    role: invitation.role,
    company: invitation.company ? String(invitation.company) : null,
    expiresAt: invitation.expiresAt,
  });
});

const completeInvitationRegistration = asyncHandler(
  async (req: Request, res: Response) => {
    const parsed = acceptInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
    }

    const tokenHash = hashInvitationToken(parsed.data.token);
    const invitation = await Invitation.findOne({ tokenHash });

    if (!invitation) {
      throw new AppError("Invalid invitation token", 400);
    }

    if (invitation.revokedAt) {
      throw new AppError("This invitation has been revoked", 400);
    }

    if (invitation.usedAt) {
      throw new AppError("This invitation has already been used", 400);
    }

    if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
      throw new AppError("This invitation has expired", 400);
    }

    const existingUser = await User.findOne({ email: invitation.email }).select("_id");
    if (existingUser) {
      throw new AppError("A user with this email already exists", 409);
    }

    const password = await hashPassword(parsed.data.password);

    // Email, role, and company are always sourced from invitation only.
    const user = await User.create({
      email: invitation.email,
      role: invitation.role,
      company: invitation.company ?? null,
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      password,
    });

    invitation.usedAt = new Date();
    await invitation.save();

    apiResponse(res, 201, "Invitation accepted and account created successfully", {
      user: {
        _id: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        company: user.company ? String(user.company) : null,
      },
    });
  }
);

export {
  createInvitation,
  completeInvitationRegistration,
};
