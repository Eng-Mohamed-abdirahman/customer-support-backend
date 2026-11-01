import { Request, Response } from "express";

import * as crypto from "crypto";

import Organization from "../../models/Organization";
import Invitation from "../../models/Invitation";
import User from "../../models/User";

import { getMailClient } from "../../config/email";
import { env } from "../../config/env";
import { apiResponse } from "../../utils/apiResponse";
import { AppError } from "../../utils/appError";
import { asyncHandler } from "../../utils/asyncHandler";
import { generateApiKey, getApiKeyPrefix } from "../../utils/generateApiKey";
import { encryptApiKey } from "../../utils/cryptoApiKey";
import { createOrganizationSchema } from "../../validators/organization.validator";
import {
  INVITATION_TTL_MS,
  assertPlatformAdmin,
  cleanString,
  createUniqueSlug,
  hashInvitationToken,
  normalizeEmail,
  organizationName,
} from "./helpers";

const sendCompanyAdminInvitationEmail = async (
  organizationName: string,
  email: string,
  invitationLink: string,
  expiresAt: Date
) => {
  const { transporter, fromAddress } = await getMailClient();

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: `You are invited to manage ${organizationName}`,
    html: `
      <p>You have been invited as <strong>company-admin</strong> for <strong>${organizationName}</strong>.</p>
      <p>Complete your account setup using the link below:</p>
      <p><a href="${invitationLink}">${invitationLink}</a></p>
      <p>This link expires at: ${expiresAt.toISOString()}</p>
    `,
  });
};

const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createOrganizationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const requester = assertPlatformAdmin(req);

  const companyName = parsed.data.name.trim();
  const normalizedName = companyName.toLowerCase();
  const normalizedEmail = normalizeEmail(parsed.data.email);

  const existingOrganization = await Organization.findOne({ normalizedName }).select("_id");
  if (existingOrganization) {
    throw new AppError("A company with this name already exists", 409);
  }

  const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");
  if (existingUser) {
    throw new AppError("A user with this email already exists", 409);
  }

  const slug = await createUniqueSlug(companyName);
  const rawApiKey = generateApiKey();
  const encryptedObj = encryptApiKey(rawApiKey);
  const apiKeyPrefix = getApiKeyPrefix(rawApiKey);
  const keyRotationTime = new Date();

  const organization = await Organization.create({
    slug,
    status: "trialing",
    profile: {
      name: companyName,
    },
    contact: {
      supportEmail: normalizedEmail,
    },
    api_settings: {
      key_prefix: apiKeyPrefix,
      encrypted_key: encryptedObj.encryptedKey,
      iv: encryptedObj.iv,
      total_tokens_used: 0,
      monthly_limit: 10000,
      last_key_rotated_at: keyRotationTime,
    },
    api_keys: [
      {
        name: "Primary",
        key_prefix: apiKeyPrefix,
        encrypted_key: encryptedObj.encryptedKey,
        iv: encryptedObj.iv,
        created_at: keyRotationTime,
        last_used_at: null,
        last_revealed_at: null,
        revoked_at: null,
      },
    ],
    normalizedName,
    createdBy: requester._id,
  });

  const now = new Date();
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
    role: "company-admin",
    company: organization._id,
    tokenHash,
    invitedBy: requester._id,
    expiresAt,
  });

  const invitationLink = `${env.frontend.url}/accept-invitation?token=${rawToken}`;

  try {
    await sendCompanyAdminInvitationEmail(
      organizationName(organization),
      normalizedEmail,
      invitationLink,
      expiresAt
    );
  } catch (error) {
    await Invitation.deleteOne({ _id: invitation._id });
    await Organization.deleteOne({ _id: organization._id });

    throw new AppError(
      "Failed to send invitation email. Check SMTP configuration and try again.",
      502
    );
  }

  apiResponse(res, 201, "Company created and invitation sent", {
    organization: {
      _id: String(organization._id),
      name: organizationName(organization),
      slug: organization.slug,
      status: organization.status,
      createdAt: organization.createdAt,
    },
    apiKey: rawApiKey,
    invitation: {
      invitationId: String(invitation._id),
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    },
  });
});

const listOrganizations = asyncHandler(async (req: Request, res: Response) => {
  assertPlatformAdmin(req);

  const organizations = await Organization.find()
    .sort({ createdAt: -1 })
    .select("_id slug status profile createdAt")
    .lean();

  const organizationIds = organizations.map((organization: any) => organization._id);
  const users =
    organizationIds.length > 0
      ? await User.find({ company: { $in: organizationIds } })
          .select("_id firstName lastName email role company createdAt")
          .sort({ createdAt: -1 })
          .lean()
      : [];

  const usersByCompany = new Map<string, any[]>();

  for (const user of users) {
    const companyId = user.company ? String(user.company) : null;

    if (!companyId) {
      continue;
    }

    if (!usersByCompany.has(companyId)) {
      usersByCompany.set(companyId, []);
    }

    usersByCompany.get(companyId)?.push({
      _id: String(user._id),
      fullName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  }

  const organizationRows = organizations.map((organization: any) => {
    const companyUsers = usersByCompany.get(String(organization._id)) ?? [];

    return {
      _id: String(organization._id),
      name: organizationName(organization),
      slug: organization.slug,
      status: cleanString(organization.status, "trialing"),
      createdAt: organization.createdAt,
      userCount: companyUsers.length,
      users: companyUsers,
    };
  });

  apiResponse(res, 200, "Organizations fetched successfully", organizationRows);
});

export {
  createOrganization,
  listOrganizations,
};
