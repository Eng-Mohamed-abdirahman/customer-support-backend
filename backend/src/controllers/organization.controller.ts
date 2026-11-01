import { Request, Response } from "express";

import * as crypto from "crypto";

import Organization from "../models/Organization";
import Invitation from "../models/Invitation";
import User from "../models/User";

import { getMailClient } from "../config/email";
import { env } from "../config/env";
import { apiResponse } from "../utils/apiResponse";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { generateSlug } from "../utils/generateSlug";
import { generateApiKey, hashApiKey, getApiKeyPrefix } from "../utils/generateApiKey";
import { encryptApiKey, decryptApiKey } from "../utils/cryptoApiKey";
import { createOrganizationSchema, createApiKeySchema, updateMyOrganizationProfileSchema, updateOrganizationAdminSettingsSchema } from "../validators/organization.validator";
import { resolveLogoDisplayUrl } from "../utils/logoUrl";
import BrandIdentity from "../models/BrandIdentity";

type UserRole = "admin" | "company-admin" | "staff";

type AuthenticatedUser = {
  _id: string;
  role: UserRole;
  company: string | null;
};

const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_FALLBACK_MESSAGE = "Our team will get back to you shortly.";
const DEFAULT_TIMEZONE = "Africa/Mogadishu";
const DEFAULT_LANGUAGE = "en";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const hashInvitationToken = (rawToken: string): string => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

const cleanString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
};

const booleanOrDefault = (value: unknown, fallback: boolean): boolean => {
  return typeof value === "boolean" ? value : fallback;
};

const organizationName = (organization: any): string => {
  const name = cleanString(organization?.profile?.name);

  return name || "Untitled organization";
};

const buildCompanyAdminOrganizationPayload = (organization: any) => ({
  _id: String(organization._id),
  name: organizationName(organization),
  slug: organization.slug,
  status: cleanString(organization.status, "trialing"),
  createdAt: organization.createdAt,
  profile: {
    name: organizationName(organization),
    logoUrl: cleanString(organization?.profile?.logoUrl),
    websiteUrl: cleanString(organization?.profile?.websiteUrl),
    businessType: cleanString(organization?.profile?.businessType),
    description: cleanString(organization?.profile?.description),
  },
  contact: {
    supportEmail: cleanString(organization?.contact?.supportEmail),
    phone: cleanString(organization?.contact?.phone),
    address: cleanString(organization?.contact?.address),
  },
  businessInfo: {
    workingHours: cleanString(organization?.businessInfo?.workingHours),
    services: cleanString(organization?.businessInfo?.services),
    products: cleanString(organization?.businessInfo?.products),
    policies: cleanString(organization?.businessInfo?.policies),
    location: cleanString(organization?.businessInfo?.location),
  },
  supportSettings: {
    fallbackMessage: cleanString(
      organization?.supportSettings?.fallbackMessage,
      DEFAULT_FALLBACK_MESSAGE
    ),
    timezone: cleanString(organization?.supportSettings?.timezone, DEFAULT_TIMEZONE),
    language: cleanString(organization?.supportSettings?.language, DEFAULT_LANGUAGE),
  },
  enabledFeatures: Array.isArray(organization?.enabledFeatures)
    ? organization.enabledFeatures.filter((f: unknown) => typeof f === "string")
    : [],
});

const buildApiKeyRecordPayload = (record: any) => {
  if (!record) {
    return null;
  }

  return {
    id: String(record._id),
    name: cleanString(record?.name, "API key"),
    keyPrefix: cleanString(record?.key_prefix),
    createdAt: record?.created_at ?? null,
    lastUsedAt: record?.last_used_at ?? null,
    lastRevealedAt: record?.last_revealed_at ?? null,
    revokedAt: record?.revoked_at ?? null,
  };
};

const buildCompanyApiKeyPayload = (organization: any) => ({
  apiSettings: {
    keyPrefix: cleanString(
      organization?.api_settings?.key_prefix,
      cleanString(organization?.apiSettings?.keyPrefix)
    ),
    lastKeyRotatedAt:
      organization?.api_settings?.last_key_rotated_at ??
      organization?.apiSettings?.lastKeyRotatedAt ??
      null,
  },
});

const buildCompanyUsagePayload = (organization: any) => ({
  organization: {
    _id: String(organization._id),
    name: organizationName(organization),
    status: cleanString(organization.status, "trialing"),
    plan: cleanString(organization?.subscription?.plan, "free"),
  },
  usage: {
    totalTokensUsed:
      typeof organization?.api_settings?.total_tokens_used === "number"
        ? organization.api_settings.total_tokens_used
        : typeof organization?.apiSettings?.totalTokensUsed === "number"
          ? organization.apiSettings.totalTokensUsed
          : 0,
    monthlyLimit:
      typeof organization?.api_settings?.monthly_limit === "number"
        ? organization.api_settings.monthly_limit
        : typeof organization?.apiSettings?.monthlyLimit === "number"
          ? organization.apiSettings.monthlyLimit
          : 10000,
  },
});

const buildAdminSettingsPayload = (organization: any) => ({
  ...buildCompanyAdminOrganizationPayload(organization),
  aiSettings: {
    aiEnabled: booleanOrDefault(organization?.aiSettings?.aiEnabled, true),
    autoReplyEnabled: booleanOrDefault(organization?.aiSettings?.autoReplyEnabled, true),
    humanHandoffEnabled: booleanOrDefault(organization?.aiSettings?.humanHandoffEnabled, true),
    modelName: cleanString(organization?.aiSettings?.modelName, "gpt-4o-mini"),
  },
  allowedChannels:
    Array.isArray(organization?.allowedChannels) && organization.allowedChannels.length > 0
      ? organization.allowedChannels
          .map((value: unknown) => cleanString(value))
          .filter(Boolean)
      : ["website"],
  apiSettings: {
    keyPrefix: cleanString(
      organization?.api_settings?.key_prefix,
      cleanString(organization?.apiSettings?.keyPrefix)
    ),
    totalTokensUsed:
      typeof organization?.api_settings?.total_tokens_used === "number"
        ? organization.api_settings.total_tokens_used
        : typeof organization?.apiSettings?.totalTokensUsed === "number"
          ? organization.apiSettings.totalTokensUsed
        : 0,
    monthlyLimit:
      typeof organization?.api_settings?.monthly_limit === "number"
        ? organization.api_settings.monthly_limit
        : typeof organization?.apiSettings?.monthlyLimit === "number"
          ? organization.apiSettings.monthlyLimit
        : 10000,
    lastKeyRotatedAt:
      organization?.api_settings?.last_key_rotated_at ?? organization?.apiSettings?.lastKeyRotatedAt ?? null,
  },
  subscription: {
    plan: cleanString(organization?.subscription?.plan, "free"),
    stripeCustomerId: cleanString(organization?.subscription?.stripeCustomerId),
  },
});

const assertPlatformAdmin = (req: Request): AuthenticatedUser => {
  const requester = req.user as AuthenticatedUser | undefined;

  if (!requester || requester.role !== "admin") {
    throw new AppError("Only platform admins can manage organizations", 403);
  }

  return requester;
};

const assertCompanyAdmin = (req: Request): AuthenticatedUser & { company: string } => {
  const requester = req.user as AuthenticatedUser | undefined;

  if (!requester || requester.role !== "company-admin") {
    throw new AppError("Only company admins can view company users", 403);
  }

  if (!requester.company) {
    throw new AppError("Company context is missing for this user", 400);
  }

  return {
    ...requester,
    company: requester.company,
  };
};

const assertOrganizationMember = (req: Request): AuthenticatedUser & { company: string } => {
  const requester = req.user as AuthenticatedUser | undefined;

  if (!requester) {
    throw new AppError("Not authorized", 401);
  }

  if (requester.role === "admin") {
    throw new AppError("Platform admins do not have an organization context", 403);
  }

  if (!requester.company) {
    throw new AppError("Company context is missing for this user", 400);
  }

  if (!["company-admin", "staff"].includes(requester.role)) {
    throw new AppError("Only organization members can access this resource", 403);
  }

  return {
    ...requester,
    company: requester.company,
  };
};

const createOrganizationApiKey = async (organization: any, name: string) => {
  const rawApiKey = generateApiKey();
  const encryptedObj = encryptApiKey(rawApiKey);
  const apiKeyPrefix = getApiKeyPrefix(rawApiKey);
  const createdAt = new Date();

  const apiKeyRecord = {
    name: cleanString(name, "Primary"),
    key_prefix: apiKeyPrefix,
    encrypted_key: encryptedObj.encryptedKey,
    iv: encryptedObj.iv,
    created_at: createdAt,
    last_used_at: null,
    last_revealed_at: null,
    revoked_at: null,
  };

  if (!Array.isArray(organization.api_keys)) {
    organization.api_keys = [];
  }

  organization.api_keys.push(apiKeyRecord);
  organization.set("api_settings.key_prefix", apiKeyPrefix);
  organization.set("api_settings.encrypted_key", encryptedObj.encryptedKey);
  organization.set("api_settings.iv", encryptedObj.iv);
  organization.set("api_settings.last_key_rotated_at", createdAt);

  const savedRecord = organization.api_keys[organization.api_keys.length - 1];

  return { rawApiKey, apiKeyRecord: savedRecord };
};

const createUniqueSlug = async (organizationName: string): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidateSlug = generateSlug(organizationName);
    const existing = await Organization.findOne({ slug: candidateSlug }).select("_id");

    if (!existing) {
      return candidateSlug;
    }
  }

  return `${generateSlug(organizationName)}-${Date.now().toString(36)}`;
};

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

const listMyCompanyUsers = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);

  const organization = await Organization.findById(requester.company)
    .select("_id slug status profile contact businessInfo supportSettings enabledFeatures createdAt")
    .lean();

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const users = await User.find({ company: requester.company })
    .select("_id firstName lastName email role createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const userRows = users.map((user: any) => ({
    _id: String(user._id),
    fullName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }));

  const organizationPayload = buildCompanyAdminOrganizationPayload(organization);
  organizationPayload.profile.logoUrl = await resolveLogoDisplayUrl(
    organizationPayload.profile.logoUrl
  );

  const brandIdentity = await BrandIdentity.findOne({ organizationId: organization._id }).lean();
  const brand =
    brandIdentity
      ? {
          brandName: cleanString(brandIdentity.brandName),
          primaryColor: cleanString(brandIdentity.primaryColor),
          secondaryColor: cleanString(brandIdentity.secondaryColor),
          fontStyle: cleanString(brandIdentity.fontStyle),
          logoUrl: await resolveLogoDisplayUrl(cleanString(brandIdentity.logoUrl)),
        }
      : null;

  apiResponse(res, 200, "Company users fetched successfully", {
    organization: organizationPayload,
    brand,
    userCount: userRows.length,
    users: userRows,
  });
});

const updateMyCompanyProfile = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);

  const parsed = updateMyOrganizationProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const organization = await Organization.findById(requester.company).select(
    "_id slug status profile contact businessInfo supportSettings enabledFeatures createdAt +normalizedName"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const nextName = parsed.data.profile.name.trim();
  const nextNormalizedName = nextName.toLowerCase();

  if (organization.normalizedName !== nextNormalizedName) {
    const existingOrganization = await Organization.findOne({
      normalizedName: nextNormalizedName,
      _id: { $ne: organization._id },
    }).select("_id");

    if (existingOrganization) {
      throw new AppError("A company with this name already exists", 409);
    }

    organization.slug = await createUniqueSlug(nextName);
  }

  organization.profile = {
    ...(organization.profile || {}),
    name: nextName,
    logoUrl: cleanString(
      parsed.data.profile.logoUrl,
      cleanString(organization.profile?.logoUrl)
    ),
    websiteUrl: cleanString(
      parsed.data.profile.websiteUrl,
      cleanString(organization.profile?.websiteUrl)
    ),
    businessType: cleanString(
      parsed.data.profile.businessType,
      cleanString(organization.profile?.businessType)
    ),
    description: cleanString(
      parsed.data.profile.description,
      cleanString(organization.profile?.description)
    ),
  };

  organization.contact = {
    ...(organization.contact || {}),
    supportEmail: normalizeEmail(parsed.data.contact.supportEmail),
    phone: cleanString(parsed.data.contact.phone, cleanString(organization.contact?.phone)),
    address: cleanString(parsed.data.contact.address, cleanString(organization.contact?.address)),
  };

  organization.businessInfo = {
    ...(organization.businessInfo || {}),
    workingHours: cleanString(
      parsed.data.businessInfo?.workingHours,
      cleanString(organization.businessInfo?.workingHours)
    ),
    services: cleanString(
      parsed.data.businessInfo?.services,
      cleanString(organization.businessInfo?.services)
    ),
    products: cleanString(
      parsed.data.businessInfo?.products,
      cleanString(organization.businessInfo?.products)
    ),
    policies: cleanString(
      parsed.data.businessInfo?.policies,
      cleanString(organization.businessInfo?.policies)
    ),
    location: cleanString(
      parsed.data.businessInfo?.location,
      cleanString(organization.businessInfo?.location)
    ),
  };

  organization.supportSettings = {
    ...(organization.supportSettings || {}),
    fallbackMessage: cleanString(
      parsed.data.supportSettings?.fallbackMessage,
      cleanString(organization.supportSettings?.fallbackMessage, DEFAULT_FALLBACK_MESSAGE)
    ),
    timezone: cleanString(
      parsed.data.supportSettings?.timezone,
      cleanString(organization.supportSettings?.timezone, DEFAULT_TIMEZONE)
    ),
    language: cleanString(
      parsed.data.supportSettings?.language,
      cleanString(organization.supportSettings?.language, DEFAULT_LANGUAGE)
    ),
  };

  if (parsed.data.enabledFeatures !== undefined) {
    organization.enabledFeatures = Array.isArray(parsed.data.enabledFeatures)
      ? parsed.data.enabledFeatures.filter((f: unknown) => typeof f === "string")
      : [];
  }

  organization.normalizedName = nextNormalizedName;

  await organization.save();

  const organizationPayload = buildCompanyAdminOrganizationPayload(organization);
  organizationPayload.profile.logoUrl = await resolveLogoDisplayUrl(
    organizationPayload.profile.logoUrl
  );

  apiResponse(res, 200, "Company profile updated successfully", {
    organization: organizationPayload,
  });
});

const listMyCompanyApiKeys = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);

  const organization = await Organization.findById(requester.company).select("_id api_keys");

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const apiKeys = Array.isArray(organization.api_keys)
    ? organization.api_keys
        .map((record: any) => buildApiKeyRecordPayload(record))
        .filter(Boolean)
        .sort((left: any, right: any) => {
          const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;
          return rightTime - leftTime;
        })
    : [];

  apiResponse(res, 200, "Company API keys fetched successfully", {
    apiKeys,
  });
});

const createMyCompanyApiKey = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);

  const parsed = createApiKeySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const organization = await Organization.findById(requester.company).select(
    "_id api_settings api_keys"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const name = cleanString(parsed.data.name, "Primary");
  const { rawApiKey, apiKeyRecord } = await createOrganizationApiKey(organization, name);

  await organization.save();

  apiResponse(res, 201, "Company API key created successfully", {
    apiKey: rawApiKey,
    apiKeyRecord: buildApiKeyRecordPayload(apiKeyRecord),
    ...buildCompanyApiKeyPayload(organization),
  });
});

const revokeMyCompanyApiKey = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);
  const apiKeyId = cleanString(req.params.apiKeyId);

  if (!apiKeyId) {
    throw new AppError("API key id is required", 400);
  }

  const organization = await Organization.findById(requester.company).select(
    "_id api_keys api_settings"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const apiKeys = Array.isArray(organization.api_keys) ? organization.api_keys : [];
  const record = apiKeys.find((item: any) => String(item?._id) === apiKeyId);

  if (!record) {
    throw new AppError("API key not found", 404);
  }

  if (!record.revoked_at) {
    record.revoked_at = new Date();
  }

  if (record?.key_prefix && organization?.api_settings?.key_prefix === record.key_prefix) {
    organization.set("api_settings.key_prefix", "");
    organization.set("api_settings.api_key_hash", "");
  }

  await organization.save();

  apiResponse(res, 200, "Company API key revoked successfully", {
    apiKeyRecord: buildApiKeyRecordPayload(record),
    ...buildCompanyApiKeyPayload(organization),
  });
});

const getMyCompanyApiKeySettings = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);

  const organization = await Organization.findById(requester.company).select(
    "_id api_settings"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  apiResponse(res, 200, "Company API settings fetched successfully", {
    ...buildCompanyApiKeyPayload(organization),
  });
});

const getMyCompanyUsage = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertOrganizationMember(req);

  const organization = await Organization.findById(requester.company).select(
    "_id status profile subscription api_settings"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  apiResponse(res, 200, "Company usage fetched successfully", {
    ...buildCompanyUsagePayload(organization),
  });
});

const listOrganizationsUsage = asyncHandler(async (req: Request, res: Response) => {
  assertPlatformAdmin(req);

  const organizations = await Organization.find()
    .sort({ createdAt: -1 })
    .select("_id status profile subscription api_settings createdAt")
    .lean();

  const rows = organizations.map((organization: any) => ({
    ...buildCompanyUsagePayload(organization),
    createdAt: organization.createdAt,
  }));

  apiResponse(res, 200, "Organization usage fetched successfully", rows);
});

const rotateMyCompanyApiKey = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);

  const organization = await Organization.findById(requester.company).select(
    "_id api_settings api_keys"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const { rawApiKey, apiKeyRecord } = await createOrganizationApiKey(
    organization,
    "Primary"
  );

  await organization.save();

  apiResponse(res, 200, "Company API key rotated successfully", {
    apiKey: rawApiKey,
    apiKeyRecord: buildApiKeyRecordPayload(apiKeyRecord),
    ...buildCompanyApiKeyPayload(organization),
  });
});

const getOrganizationAdminSettings = asyncHandler(async (req: Request, res: Response) => {
  assertPlatformAdmin(req);

  const organizationId = req.params.organizationId;
  const organization = await Organization.findById(organizationId).select(
    "_id slug status profile contact businessInfo supportSettings aiSettings allowedChannels api_settings subscription createdAt"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  apiResponse(res, 200, "Organization settings fetched successfully", {
    organization: buildAdminSettingsPayload(organization),
  });
});

const updateOrganizationAdminSettings = asyncHandler(async (req: Request, res: Response) => {
  assertPlatformAdmin(req);

  const payload = { ...(req.body ?? {}) } as Record<string, unknown>;

  if (payload.iSettings && !payload.aiSettings) {
    payload.aiSettings = payload.iSettings;
  }

  if (payload.iSettings) {
    delete payload.iSettings;
  }

  const parsed = updateOrganizationAdminSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const organizationId = req.params.organizationId;
  const organization = await Organization.findById(organizationId).select(
    "_id slug status profile contact businessInfo supportSettings aiSettings allowedChannels api_settings subscription createdAt"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  if (parsed.data.status !== undefined) {
    organization.status = parsed.data.status;
  }

  if (parsed.data.aiSettings) {
    organization.aiSettings = {
      ...(organization.aiSettings || {}),
      aiEnabled: booleanOrDefault(
        parsed.data.aiSettings.aiEnabled,
        booleanOrDefault(organization.aiSettings?.aiEnabled, true)
      ),
      autoReplyEnabled: booleanOrDefault(
        parsed.data.aiSettings.autoReplyEnabled,
        booleanOrDefault(organization.aiSettings?.autoReplyEnabled, true)
      ),
      humanHandoffEnabled: booleanOrDefault(
        parsed.data.aiSettings.humanHandoffEnabled,
        booleanOrDefault(organization.aiSettings?.humanHandoffEnabled, true)
      ),
      modelName: cleanString(
        parsed.data.aiSettings.modelName,
        cleanString(organization.aiSettings?.modelName, "gpt-4o-mini")
      ),
    };
  }

  if (parsed.data.allowedChannels) {
    organization.allowedChannels = parsed.data.allowedChannels
      .map((value: string) => value.trim())
      .filter(Boolean);
  }

  if (parsed.data.apiSettings) {
    organization.set(
      "api_settings.key_prefix",
      cleanString(parsed.data.apiSettings.keyPrefix, cleanString(organization.api_settings?.key_prefix))
    );
    organization.set(
      "api_settings.total_tokens_used",
      parsed.data.apiSettings.totalTokensUsed !== undefined
        ? parsed.data.apiSettings.totalTokensUsed
        : typeof organization.api_settings?.total_tokens_used === "number"
          ? organization.api_settings.total_tokens_used
          : 0
    );
    organization.set(
      "api_settings.monthly_limit",
      parsed.data.apiSettings.monthlyLimit !== undefined
        ? parsed.data.apiSettings.monthlyLimit
        : typeof organization.api_settings?.monthly_limit === "number"
          ? organization.api_settings.monthly_limit
          : 10000
    );

    if (parsed.data.apiSettings.apiKeyHash !== undefined) {
      organization.set("api_settings.api_key_hash", cleanString(parsed.data.apiSettings.apiKeyHash));
      organization.set("api_settings.last_key_rotated_at", new Date());
    }
  }

  if (parsed.data.subscription) {
    organization.set(
      "subscription.plan",
      cleanString(parsed.data.subscription.plan, cleanString(organization.subscription?.plan, "free"))
    );
    organization.set(
      "subscription.stripeCustomerId",
      cleanString(
        parsed.data.subscription.stripeCustomerId,
        cleanString(organization.subscription?.stripeCustomerId)
      )
    );
  }

  await organization.save();

  apiResponse(res, 200, "Organization admin settings updated successfully", {
    organization: buildAdminSettingsPayload(organization),
  });
});



const revealMyCompanyApiKey = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);
  const apiKeyId = cleanString(req.params.apiKeyId);

  if (!apiKeyId) {
    throw new AppError("API key id is required", 400);
  }

  const organization = await Organization.findById(requester.company).select(
    "_id api_keys"
  );
  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const record = organization.api_keys.id(apiKeyId);
  if (!record) {
    throw new AppError("API key not found", 404);
  }

  if (record.revoked_at) {
    throw new AppError("Cannot reveal a revoked API key", 400);
  }

  if (!record.encrypted_key || !record.iv) {
    throw new AppError("This API key cannot be revealed", 400);
  }

  record.last_revealed_at = new Date();
  await organization.save();

  const rawApiKey = decryptApiKey(record.encrypted_key, record.iv);

  apiResponse(res, 200, "API key revealed", {
    apiKey: rawApiKey,
    apiKeyRecord: buildApiKeyRecordPayload(record),
  });
});

const deleteMyCompanyApiKey = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);
  const apiKeyId = cleanString(req.params.apiKeyId);

  if (!apiKeyId) {
    throw new AppError("API key id is required", 400);
  }

  const organization = await Organization.findById(requester.company).select(
    "_id api_keys api_settings"
  );
  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const record = organization.api_keys.id(apiKeyId);
  if (!record) {
    throw new AppError("API key not found", 404);
  }

  // If this was the active global key setting, we might need to clear it, but let's just delete the subdoc
  organization.api_keys.pull(record._id);

  if (organization.api_keys.length > 0) {
     const lastKey = organization.api_keys[organization.api_keys.length - 1];
     organization.set("api_settings.key_prefix", lastKey.key_prefix);
     organization.set("api_settings.encrypted_key", lastKey.encrypted_key);
     organization.set("api_settings.iv", lastKey.iv);
  } else {
     organization.set("api_settings.key_prefix", "");
     organization.set("api_settings.encrypted_key", "");
     organization.set("api_settings.iv", "");
  }

  await organization.save();

  apiResponse(res, 200, "API key deleted successfully", {
    success: true,
  });
});


export {
  createOrganization,
  listOrganizations,
  listMyCompanyUsers,
  updateMyCompanyProfile,
  listMyCompanyApiKeys,
  createMyCompanyApiKey,
  revokeMyCompanyApiKey,
  revealMyCompanyApiKey,
  deleteMyCompanyApiKey,
  getMyCompanyApiKeySettings,
  getMyCompanyUsage,
  listOrganizationsUsage,
  rotateMyCompanyApiKey,
  getOrganizationAdminSettings,
  updateOrganizationAdminSettings,
};