import { Request, Response } from "express";

const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const Conversation = require("../models/Conversation");
const Ticket = require("../models/Ticket");

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
  getRecentHistory,
} = require("../services/conversationStore.service");
const { emitToOrganization } = require("../services/socket.service");
const {
  getActiveConnectionByOrganizationId,
  resolveAccessToken,
} = require("../services/whatsapp.service");
const { sendWhatsAppTextMessage } = require("../services/whatsappGraph.service");
const { sendMessage } = require("../services/whatsappSender.service");

const previewConversationOrganizationSelect =
  "_id status profile contact businessInfo supportSettings aiSettings allowedChannels api_settings";

type AuthenticatedUser = {
  _id: string;
  role: "admin" | "company-admin" | "staff";
  company?: string | null;
  organizationId?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
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
  const requester = (req as any).user as any;
  const organizationId =
    normalizeText(requester?.accountId) ||
    normalizeText(requester?.organizationId) ||
    normalizeText(requester?.company);

  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new AppError("Organization context is missing for this user", 400);
  }

  return String(organizationId);
};

const resolveAgentDisplayName = (requester?: AuthenticatedUser): string => {
  const firstName = normalizeText(requester?.firstName);
  const lastName = normalizeText(requester?.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || normalizeText(requester?.email) || "Support agent";
};

const resolveConversationById = async (organizationId: string, conversationId: string) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    organizationId,
  });

  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  return conversation;
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

  if (!conversation.aiEnabled) {
    const organizationContext = toConversationOrganizationContext(organization);
    apiResponse(res, 200, "Conversation reply generated successfully", {
      reply: "",
      mode: "human_handoff",
      intent: "human_handoff",
      retrievedSources: [],
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalTokensUsed: organizationContext.api_settings?.total_tokens_used ?? 0,
        monthlyLimit: organizationContext.api_settings?.monthly_limit ?? 0,
      },
      channel,
      conversationId: String(conversation._id),
    });
    return;
  }

  const storedHistory = await getRecentHistory({
    organizationId,
    conversationId: String(conversation._id),
    limit: 8,
  });

  const historyForAi = storedHistory.filter((item: any, index: number, list: any[]) => {
    if (index !== list.length - 1) {
      return true;
    }

    return !(item.role === "customer" && item.content === payload.message.trim());
  });

  const result = await generateConversationReply({
    organization: toConversationOrganizationContext(organization),
    message: payload.message,
    channel,
    topK: payload.topK,
    history: historyForAi,
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

const takeoverConversation = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const conversationId = normalizeText(req.params?.id);
  const requester = (req as any).user as AuthenticatedUser | undefined;

  if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Conversation not found", 404);
  }

  if (!requester?._id) {
    throw new AppError("Not authorized to take over this conversation", 401);
  }

  const conversation = await resolveConversationById(organizationId, conversationId);
  conversation.responderType = "agent";
  conversation.assignedAgentId = requester._id;
  await conversation.save();

  await Ticket.findOneAndUpdate(
    { organizationId, conversationId, status: "open" },
    { $set: { assignedTo: requester._id, status: "pending" } },
    { returnDocument: "after" }
  );

  const agentName = resolveAgentDisplayName(requester);
  await appendMessage({
    organizationId,
    conversationId: String(conversation._id),
    senderType: "system",
    messageType: "text",
    contentText: `Support agent ${agentName} has taken over the chat.`,
    aiGenerated: false,
  });

  emitToOrganization(organizationId, "conversation:updated", {
    conversationId: String(conversation._id),
    aiEnabled: false,
    responderType: "agent",
    assignedAgent: String(requester._id),
    assignedAgentId: String(requester._id),
    lastMessageAt: new Date(),
  });

  apiResponse(res, 200, "Conversation takeover completed", {
    conversationId: String(conversation._id),
    responderType: "agent",
    assignedAgentId: String(requester._id),
  });
});

const returnConversationToAi = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const conversationId = normalizeText(req.params?.id);
  const requester = (req as any).user as AuthenticatedUser | undefined;

  if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Conversation not found", 404);
  }

  if (!requester?._id) {
    throw new AppError("Not authorized to return this conversation", 401);
  }

  const conversation = await resolveConversationById(organizationId, conversationId);
  conversation.responderType = "ai";
  conversation.assignedAgentId = null;
  await conversation.save();

  await Ticket.findOneAndUpdate(
    { organizationId, conversationId, status: "pending" },
    { $set: { assignedTo: null, status: "open" } },
    { returnDocument: "after" }
  );

  const agentName = resolveAgentDisplayName(requester);
  await appendMessage({
    organizationId,
    conversationId: String(conversation._id),
    senderType: "system",
    messageType: "text",
    contentText: `Support agent ${agentName} returned the chat to AI.`,
    aiGenerated: false,
  });

  emitToOrganization(organizationId, "conversation:updated", {
    conversationId: String(conversation._id),
    aiEnabled: true,
    responderType: "ai",
    assignedAgent: null,
    assignedAgentId: null,
    lastMessageAt: new Date(),
  });

  apiResponse(res, 200, "Conversation returned to AI", {
    conversationId: String(conversation._id),
    responderType: "ai",
    assignedAgentId: null,
  });
});

const sendAgentMessage = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const conversationId = normalizeText(req.params?.id);
  const contentText = normalizeText(req.body?.content);

  if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Conversation not found", 404);
  }

  if (!contentText) {
    throw new AppError("Message content is required", 400);
  }

  const conversation = await resolveConversationById(organizationId, conversationId);

  const message = await appendMessage({
    organizationId,
    conversationId: String(conversation._id),
    senderType: "agent",
    messageType: "text",
    contentText,
    aiGenerated: false,
  });

  if (normalizeText(conversation.channel).toLowerCase() === "whatsapp") {
    // Send message using the unified, dynamic WhatsApp sender service
    await sendMessage(
      organizationId,
      normalizeText(conversation.customerPhone),
      contentText
    );
  }

  apiResponse(res, 200, "Message sent successfully", {
    message,
  });
});

module.exports = {
  askCustomerConversation,
  previewConversation,
  listOrganizationConversations,
  listConversationMessages,
  takeoverConversation,
  returnConversationToAi,
  sendAgentMessage,
};

export {};