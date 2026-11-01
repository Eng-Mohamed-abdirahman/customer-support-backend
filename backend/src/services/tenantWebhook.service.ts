/**
 * Multi-tenant WhatsApp webhook tenant resolution.
 * Maps phone_number_id → WhatsApp connection → decrypted token → organization context.
 */
import Organization from "../models/Organization";
import { AppError } from "../utils/appError";
import { whatsappLog } from "../utils/whatsappLogger";
import { getConnectionByPhoneNumberId, resolveAccessToken } from "./whatsapp.service";

const webhookOrganizationSelect =
  "_id status slug profile contact businessInfo supportSettings aiSettings allowedChannels enabledFeatures knowledgeBaseReference" +
  " api_settings.total_tokens_used api_settings.monthly_limit";

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toTenantOrganizationContext = (organization: any) => ({
  _id: String(organization._id),
  status: typeof organization.status === "string" ? organization.status : "active",
  slug: organization?.slug ?? "",
  profile: {
    name: organization?.profile?.name ?? "",
    businessType: organization?.profile?.businessType ?? "",
    description: organization?.profile?.description ?? "",
  },
  contact: {
    supportEmail: organization?.contact?.supportEmail ?? "",
  },
  businessInfo: {
    workingHours: organization?.businessInfo?.workingHours ?? "",
    services: organization?.businessInfo?.services ?? "",
    products: organization?.businessInfo?.products ?? "",
    policies: organization?.businessInfo?.policies ?? "",
    location: organization?.businessInfo?.location ?? "",
  },
  supportSettings: {
    fallbackMessage: organization?.supportSettings?.fallbackMessage ?? "",
    timezone: organization?.supportSettings?.timezone ?? "",
    language: organization?.supportSettings?.language ?? "",
  },
  knowledgeBaseReference: organization?.knowledgeBaseReference ?? "",
  aiSettings: {
    aiEnabled: Boolean(organization?.aiSettings?.aiEnabled ?? true),
    autoReplyEnabled: Boolean(organization?.aiSettings?.autoReplyEnabled ?? true),
    humanHandoffEnabled: Boolean(organization?.aiSettings?.humanHandoffEnabled ?? true),
    modelName: organization?.aiSettings?.modelName ?? "gpt-4o-mini",
  },
  allowedChannels: Array.isArray(organization?.allowedChannels)
    ? organization.allowedChannels
    : ["website", "whatsapp"],
  enabledFeatures: Array.isArray(organization?.enabledFeatures) ? organization.enabledFeatures : [],
  api_settings: {
    total_tokens_used:
      typeof organization?.api_settings?.total_tokens_used === "number"
        ? organization.api_settings.total_tokens_used
        : 0,
    monthly_limit:
      typeof organization?.api_settings?.monthly_limit === "number"
        ? organization.api_settings.monthly_limit
        : 10000,
  },
});

/**
 * Step 1–3 from the multi-tenant spec:
 * - resolve WhatsApp config by phoneNumberId
 * - decrypt access token in memory
 * - load parent organization (aiSettings, businessInfo, knowledge base ref)
 */
const loadTenantByPhoneNumberId = async (phoneNumberId: string) => {
  const normalizedPhoneNumberId = normalizeText(phoneNumberId);

  whatsappLog.debug("TENANT_RESOLVE", "Resolving tenant by phone_number_id", {
    phoneNumberId: normalizedPhoneNumberId,
  });

  if (!normalizedPhoneNumberId) {
    whatsappLog.warn("TENANT_RESOLVE", "Missing phone_number_id in webhook metadata");
    throw new AppError("phone_number_id is required in webhook metadata", 400);
  }

  const connection = await getConnectionByPhoneNumberId(normalizedPhoneNumberId);

  if (!connection) {
    whatsappLog.warn("TENANT_RESOLVE", "No WhatsApp connection found for phone_number_id", {
      phoneNumberId: normalizedPhoneNumberId,
    });
    throw new AppError(`WhatsApp config not found for phone_number_id ${normalizedPhoneNumberId}`, 404);
  }

  whatsappLog.debug("TENANT_RESOLVE", "Connection found", {
    phoneNumberId: normalizedPhoneNumberId,
    organizationId: String(connection.organizationId),
    wabaId: connection.wabaId,
    status: connection.status,
    webhookSubscriptionStatus: connection.webhookSubscriptionStatus,
  });

  let accessToken: string;
  try {
    accessToken = resolveAccessToken(connection);
    whatsappLog.debug("TENANT_RESOLVE", "Access token decrypted", {
      phoneNumberId: normalizedPhoneNumberId,
      accessToken,
    });
  } catch (error: any) {
    whatsappLog.error("TENANT_RESOLVE", "Failed to decrypt access token", {
      phoneNumberId: normalizedPhoneNumberId,
      organizationId: String(connection.organizationId),
      error: String(error?.message ?? error),
    });
    throw new AppError(
      `Failed to decrypt WhatsApp access token: ${error?.message ?? "unknown error"}`,
      500
    );
  }

  const organization = await Organization.findById(connection.organizationId).select(
    webhookOrganizationSelect
  );

  if (!organization) {
    whatsappLog.error("TENANT_RESOLVE", "Organization not found for connection", {
      phoneNumberId: normalizedPhoneNumberId,
      organizationId: String(connection.organizationId),
    });
    throw new AppError(`Organization not found for WhatsApp config ${normalizedPhoneNumberId}`, 404);
  }

  if (organization.status === "suspended" || organization.status === "cancelled") {
    whatsappLog.warn("TENANT_RESOLVE", "Organization is not active", {
      phoneNumberId: normalizedPhoneNumberId,
      organizationId: String(organization._id),
      status: organization.status,
    });
    throw new AppError("Organization is not active", 403);
  }

  whatsappLog.info("TENANT_RESOLVE", "Tenant resolved successfully", {
    phoneNumberId: normalizedPhoneNumberId,
    organizationId: String(organization._id),
    organizationName: organization?.profile?.name ?? "",
    wabaId: connection.wabaId,
  });

  return {
    connection,
    organization,
    organizationContext: toTenantOrganizationContext(organization),
    accessToken,
  };
};

const isAiAutoReplyEnabled = (organizationContext: ReturnType<typeof toTenantOrganizationContext>) => {
  const aiEnabled = Boolean(organizationContext.aiSettings?.aiEnabled ?? true);
  const autoReplyEnabled = Boolean(organizationContext.aiSettings?.autoReplyEnabled ?? true);

  const allowedChannels = Array.isArray(organizationContext.allowedChannels)
    ? organizationContext.allowedChannels.map((channel) => normalizeText(channel).toLowerCase())
    : ["website", "whatsapp"];

  const whatsappAllowed = allowedChannels.includes("whatsapp");

  return aiEnabled && autoReplyEnabled && whatsappAllowed;
};

export {
  webhookOrganizationSelect,
  toTenantOrganizationContext,
  loadTenantByPhoneNumberId,
  isAiAutoReplyEnabled,
};

