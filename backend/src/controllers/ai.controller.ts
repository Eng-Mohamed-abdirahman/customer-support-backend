import { Request, Response } from "express";

import { apiResponse } from "../utils/apiResponse";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { askConversationSchema } from "../validators/conversation.validator";
import { generateConversationReply } from "../services/conversation.service";

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toConversationOrganizationContext = (organization: any) => ({
  _id: String(organization._id),
  status: typeof organization.status === "string" ? organization.status : "active",
  profile: {
    name: organization?.profile?.name ?? "",
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
  aiSettings: {
    aiEnabled: Boolean(organization?.aiSettings?.aiEnabled ?? true),
    autoReplyEnabled: Boolean(organization?.aiSettings?.autoReplyEnabled ?? true),
    humanHandoffEnabled: Boolean(organization?.aiSettings?.humanHandoffEnabled ?? true),
    modelName: organization?.aiSettings?.modelName ?? "gpt-4o-mini",
  },
  allowedChannels: Array.isArray(organization?.allowedChannels)
    ? organization.allowedChannels
    : ["website"],
  api_settings: {
    total_tokens_used:
      typeof organization?.api_settings?.total_tokens_used === "number"
        ? organization.api_settings.total_tokens_used
        : typeof organization?.apiSettings?.totalTokensUsed === "number"
          ? organization.apiSettings.totalTokensUsed
          : 0,
    monthly_limit:
      typeof organization?.api_settings?.monthly_limit === "number"
        ? organization.api_settings.monthly_limit
        : typeof organization?.apiSettings?.monthlyLimit === "number"
          ? organization.apiSettings.monthlyLimit
          : 10000,
  },
});

const parseChatPayload = (req: Request) => {
  const parsed = askConversationSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  return parsed.data;
};

const chatWithAi = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseChatPayload(req);
  const organization = (req as any).organization;
  const organizationId = normalizeText((req as any).organizationId);

  if (!organization || !organizationId) {
    throw new AppError("Invalid organization context", 401);
  }

  const result = await generateConversationReply({
    organization: toConversationOrganizationContext(organization),
    message: payload.message,
    channel: payload.channel ?? "whatsapp",
    topK: payload.topK,
    history: payload.history,
    customer: payload.customer,
  });

  apiResponse(res, 200, "AI response generated successfully", {
    ...result,
    channel: payload.channel ?? "whatsapp",
  });
});

export {
  chatWithAi,
};

