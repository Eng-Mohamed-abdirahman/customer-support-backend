const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { emitToConversation, emitToOrganization } = require("./socket.service");

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const getOrCreateConversation = async (input: {
  organizationId: string;
  channel: string;
  customerPhone: string;
  customerName?: string;
  metadata?: Record<string, unknown>;
}) => {
  const query = {
    organizationId: input.organizationId,
    channel: normalizeText(input.channel) || "whatsapp",
    customerPhone: normalizeText(input.customerPhone),
  };

  let conversation = await Conversation.findOne(query);

  if (!conversation) {
    conversation = await Conversation.create({
      ...query,
      customerName: normalizeText(input.customerName),
      metadata: input.metadata ?? {},
      status: "open",
      aiEnabled: true,
      lastMessageAt: new Date(),
    });

    return conversation;
  }

  const updatedName = normalizeText(input.customerName);
  if (updatedName && updatedName !== conversation.customerName) {
    conversation.customerName = updatedName;
  }

  conversation.lastMessageAt = new Date();
  await conversation.save();

  return conversation;
};

const appendMessage = async (input: {
  organizationId: string;
  conversationId: string;
  senderType: "customer" | "assistant" | "agent" | "system";
  messageType: "text" | "image" | "document" | "audio";
  contentText?: string;
  media?: {
    id?: string;
    url?: string;
    mimeType?: string;
    fileName?: string;
    caption?: string;
    sha256?: string;
    fileSize?: number;
  };
  aiGenerated?: boolean;
  externalId?: string;
}) => {
  const message = await Message.create({
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    senderType: input.senderType,
    messageType: input.messageType,
    contentText: normalizeText(input.contentText),
    media: {
      id: input.media?.id ?? "",
      url: input.media?.url ?? "",
      mimeType: input.media?.mimeType ?? "",
      fileName: input.media?.fileName ?? "",
      caption: input.media?.caption ?? "",
      sha256: input.media?.sha256 ?? "",
      fileSize: input.media?.fileSize ?? 0,
    },
    aiGenerated: Boolean(input.aiGenerated),
    externalId: normalizeText(input.externalId),
  });

  await Conversation.updateOne(
    { _id: input.conversationId, organizationId: input.organizationId },
    { $set: { lastMessageAt: new Date() } }
  );

  const messagePayload = {
    _id: String(message._id),
    organizationId: String(message.organizationId),
    conversationId: String(message.conversationId),
    senderType: message.senderType,
    messageType: message.messageType,
    contentText: message.contentText,
    media: message.media,
    aiGenerated: message.aiGenerated,
    externalId: message.externalId,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };

  emitToOrganization(String(input.organizationId), "message:new", messagePayload);
  emitToConversation(String(input.conversationId), "message:new", messagePayload);

  emitToOrganization(String(input.organizationId), "conversation:updated", {
    conversationId: String(input.conversationId),
    lastMessageAt: new Date(),
  });

  return message;
};

const listConversations = async (input: {
  organizationId: string;
  status?: string;
  channel?: string;
  limit?: number;
  skip?: number;
}) => {
  const filter: Record<string, unknown> = {
    organizationId: input.organizationId,
  };

  if (input.status) {
    filter.status = input.status;
  }

  if (input.channel) {
    filter.channel = input.channel;
  }

  const limit = typeof input.limit === "number" ? input.limit : 50;
  const skip = typeof input.skip === "number" ? input.skip : 0;

  return Conversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const listMessages = async (input: {
  organizationId: string;
  conversationId: string;
  limit?: number;
  skip?: number;
}) => {
  const limit = typeof input.limit === "number" ? input.limit : 100;
  const skip = typeof input.skip === "number" ? input.skip : 0;

  return Message.find({
    organizationId: input.organizationId,
    conversationId: input.conversationId,
  })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const getRecentHistory = async (input: {
  organizationId: string;
  conversationId: string;
  limit?: number;
}) => {
  const limit = typeof input.limit === "number" ? input.limit : 8;

  const messages = await Message.find({
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    messageType: "text",
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return messages
    .reverse()
    .map((message: any) => {
      const role = message.senderType === "customer" ? "customer" : "assistant";
      return {
        role,
        content: normalizeText(message.contentText),
      };
    })
    .filter((item: any) => item.content.length > 0);
};

module.exports = {
  getOrCreateConversation,
  appendMessage,
  listConversations,
  listMessages,
  getRecentHistory,
};

export {};
