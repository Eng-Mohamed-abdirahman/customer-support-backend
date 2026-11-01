import { Request } from "express";

import * as crypto from "crypto";

import Organization from "../../models/Organization";

import { AppError } from "../../utils/appError";
import { generateSlug } from "../../utils/generateSlug";
import { generateApiKey, getApiKeyPrefix } from "../../utils/generateApiKey";
import { encryptApiKey } from "../../utils/cryptoApiKey";

export type UserRole = "admin" | "company-admin" | "staff";

export type AuthenticatedUser = {
  _id: string;
  role: UserRole;
  company: string | null;
};

export const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_FALLBACK_MESSAGE = "Our team will get back to you shortly.";
export const DEFAULT_TIMEZONE = "Africa/Mogadishu";
export const DEFAULT_LANGUAGE = "en";

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const hashInvitationToken = (rawToken: string): string => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

export const cleanString = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
};

export const booleanOrDefault = (value: unknown, fallback: boolean): boolean => {
  return typeof value === "boolean" ? value : fallback;
};

export const organizationName = (organization: any): string => {
  const name = cleanString(organization?.profile?.name);

  return name || "Untitled organization";
};

export const buildCompanyAdminOrganizationPayload = (organization: any) => ({
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

export const buildApiKeyRecordPayload = (record: any) => {
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

export const buildCompanyApiKeyPayload = (organization: any) => ({
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

export const buildCompanyUsagePayload = (organization: any) => ({
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

export const buildAdminSettingsPayload = (organization: any) => ({
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

export const assertPlatformAdmin = (req: Request): AuthenticatedUser => {
  const requester = req.user as AuthenticatedUser | undefined;

  if (!requester || requester.role !== "admin") {
    throw new AppError("Only platform admins can manage organizations", 403);
  }

  return requester;
};

export const assertCompanyAdmin = (req: Request): AuthenticatedUser & { company: string } => {
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

export const assertOrganizationMember = (req: Request): AuthenticatedUser & { company: string } => {
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

export const createOrganizationApiKey = async (organization: any, name: string) => {
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

export const createUniqueSlug = async (organizationName: string): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidateSlug = generateSlug(organizationName);
    const existing = await Organization.findOne({ slug: candidateSlug }).select("_id");

    if (!existing) {
      return candidateSlug;
    }
  }

  return `${generateSlug(organizationName)}-${Date.now().toString(36)}`;
};
