import { Request, Response } from "express";

const mongoose = require("mongoose");
const Organization = require("../models/Organization");

const { apiResponse } = require("../utils/apiResponse");
const { AppError } = require("../utils/appError");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  askConversationSchema,
  listConversationsSchema,
  listMessagesSchema,
} = require("../validators/conversation.validator");
const { generateConversationReply } = require("../services/conversation.service");
const {
  listConversations,
  listMessages,
  getOrCreateConversation,
  appendMessage,
} = require("../services/conversationStore.service");

const previewConversationOrganizationSelect =
  "_id status profile contact businessInfo supportSettings aiSettings allowedChannels api_settings";

type AuthenticatedUser = {
  _id: string;
  role: "admin" | "company-admin" | "staff";
  company?: string | null;
  organizationId?: string | null;
};

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const resolveCustomerIdentifier = (
  payload: { customer?: { id?: string; email?: string; name?: string } },
  req: Request
) => {
  const customerId = normalizeText(payload.customer?.id);
  const customerEmail = normalizeText(payload.customer?.email).toLowerCase();
  const customerName = normalizeText(payload.customer?.name);
  const ipAddress = normalizeText(req.ip);

  return {
    customerPhone: customerId || customerEmail || (ipAddress ? `ip:${ipAddress}` : "anonymous"),
    customerName,
  };
};

const buildConversationMetadata = (req: Request, payload: { customer?: any }) => {
  return {
    origin: normalizeText(req.headers.origin),
    referer: normalizeText(req.headers.referer),
    userAgent: normalizeText(req.headers["user-agent"]),
    customer: payload.customer ?? {},
  };
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

const parseConversationPayload = (req: Request) => {
  const parsed = askConversationSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  return parsed.data;
};

const resolveOrganizationFromRequester = async (req: Request) => {
  const requester = (req as any).user as AuthenticatedUser | undefined;

  const organizationId = normalizeText(requester?.organizationId) || normalizeText(requester?.company);

  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new AppError("Organization context is missing for this user", 400);
  }

  const organization = await Organization.findById(organizationId).select(
    previewConversationOrganizationSelect
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  return toConversationOrganizationContext(organization);
};

const resolveOrganizationId = (req: Request): string => {
  const requester = (req as any).user as AuthenticatedUser | undefined;
  const organizationId = normalizeText(requester?.organizationId) || normalizeText(requester?.company);

  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new AppError("Organization context is missing for this user", 400);
  }

  return String(organizationId);
};

const parseListConversationsPayload = (req: Request) => {
  const parsed = listConversationsSchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  return parsed.data;
};

const parseListMessagesPayload = (req: Request) => {
  const parsed = listMessagesSchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  return parsed.data;
};

const askCustomerConversation = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseConversationPayload(req);
  const organization = (req as any).organization;
  const organizationId = (req as any).organizationId;

  if (!organization || !organizationId) {
    throw new AppError("Invalid customer context", 401);
  }

  const channel = payload.channel ?? "website";
  const { customerPhone, customerName } = resolveCustomerIdentifier(payload, req);

  const conversation = await getOrCreateConversation({
    organizationId,
    channel,
    customerPhone,
    customerName,
    metadata: buildConversationMetadata(req, payload),
  });

  await appendMessage({
    organizationId,
    conversationId: String(conversation._id),
    senderType: "customer",
    messageType: "text",
    contentText: payload.message,
    aiGenerated: false,
  });

  const result = await generateConversationReply({
    organization: toConversationOrganizationContext(organization),
    message: payload.message,
    channel,
    topK: payload.topK,
    history: payload.history,
    customer: payload.customer,
  });

  await appendMessage({
    organizationId,
    conversationId: String(conversation._id),
    senderType: "assistant",
    messageType: "text",
    contentText: result.reply,
    aiGenerated: true,
  });

  apiResponse(res, 200, "Conversation reply generated successfully", {
    ...result,
    channel,
    conversationId: String(conversation._id),
  });
});

const previewConversation = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseConversationPayload(req);
  const organization = await resolveOrganizationFromRequester(req);

  const result = await generateConversationReply({
    organization,
    message: payload.message,
    channel: payload.channel ?? "dashboard",
    topK: payload.topK,
    history: payload.history,
    customer: payload.customer,
  });

  apiResponse(res, 200, "Conversation preview generated successfully", {
    ...result,
    channel: payload.channel ?? "dashboard",
  });
});

const listOrganizationConversations = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const payload = parseListConversationsPayload(req);

  const conversations = await listConversations({
    organizationId,
    status: payload.status,
    channel: payload.channel,
    limit: payload.limit,
    skip: payload.skip,
  });

  apiResponse(res, 200, "Conversations retrieved successfully", {
    conversations,
  });
});

const listConversationMessages = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const payload = parseListMessagesPayload(req);
  const conversationId = normalizeText(req.params?.id);

  if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Conversation not found", 404);
  }

  const messages = await listMessages({
    organizationId,
    conversationId,
    limit: payload.limit,
    skip: payload.skip,
  });

  apiResponse(res, 200, "Conversation messages retrieved successfully", {
    messages,
  });
});

module.exports = {
  askCustomerConversation,
  previewConversation,
  listOrganizationConversations,
  listConversationMessages,
};

export {};