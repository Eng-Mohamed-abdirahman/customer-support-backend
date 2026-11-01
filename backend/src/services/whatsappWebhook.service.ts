const Message = require("../models/Message");
const WebhookLog = require("../models/WebhookLog");
const CustomerMessage = require("../models/CustomerMessage");
const AIConversation = require("../models/AIConversation");

const { env } = require("../config/env");
const { AppError } = require("../utils/appError");
const { whatsappLog } = require("../utils/whatsappLogger");
const { generateConversationReply } = require("./conversation.service");
const {
  getOrCreateConversation,
  appendMessage,
  getRecentHistory,
} = require("./conversationStore.service");
const {
  loadTenantByPhoneNumberId,
  isAiAutoReplyEnabled,
} = require("./tenantWebhook.service");
const { sendWhatsAppTextMessage } = require("./whatsappGraph.service");

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const graphBaseUrl = env.WHATSAPP_GRAPH_BASE_URL || "https://graph.facebook.com";
const graphVersion = env.WHATSAPP_GRAPH_VERSION || "v20.0";

const buildGraphUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${graphBaseUrl}/${graphVersion}/${normalizedPath}`;
};

const fetchJson = async (url: string, options: any) => {
  const response = await fetch(url, options);
  const text = await response.text();

  if (!response.ok) {
    throw new AppError(`WhatsApp API error: ${text || response.statusText}`, response.status);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const fetchMediaDetails = async (accessToken: string, mediaId: string) => {
  const url = buildGraphUrl(`${mediaId}?fields=url,mime_type,sha256,file_size`);

  return fetchJson(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

const sendWhatsAppMessageWithRetry = async (input: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  text: string;
}) => {
  const maxAttempts = 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      whatsappLog.debug("MESSAGE_SEND", `Send attempt ${attempt}/${maxAttempts}`, {
        phoneNumberId: input.phoneNumberId,
        to: input.to,
      });
      return await sendWhatsAppTextMessage(input);
    } catch (error: any) {
      whatsappLog.warn("MESSAGE_SEND", `Send attempt ${attempt}/${maxAttempts} failed`, {
        phoneNumberId: input.phoneNumberId,
        to: input.to,
        error: String(error?.message ?? error),
      });

      if (attempt >= maxAttempts) {
        whatsappLog.error("MESSAGE_SEND", "All send attempts exhausted", {
          phoneNumberId: input.phoneNumberId,
          to: input.to,
          attempts: maxAttempts,
        });
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * Math.pow(2, attempt)));
    }
  }
};

const buildCustomerMessageText = (messageType: string, contentText: string) => {
  if (contentText) {
    return contentText;
  }

  if (messageType === "image") {
    return "Customer sent an image.";
  }

  if (messageType === "document") {
    return "Customer sent a document.";
  }

  if (messageType === "audio") {
    return "Customer sent an audio message.";
  }

  return "Customer sent a message.";
};

const extractMessagePayload = async (message: any, accessToken: string) => {
  const messageType = normalizeText(message?.type) || "text";

  if (messageType === "text") {
    return {
      messageType: "text",
      contentText: normalizeText(message?.text?.body),
      media: null,
    };
  }

  if (["image", "document", "audio"].includes(messageType)) {
    const mediaPayload = message?.[messageType] ?? {};
    const mediaId = normalizeText(mediaPayload?.id);
    const caption = normalizeText(mediaPayload?.caption);
    const fileName = normalizeText(mediaPayload?.filename);

    let mediaDetails: any = {};

    if (mediaId) {
      mediaDetails = await fetchMediaDetails(accessToken, mediaId);
    }

    return {
      messageType,
      contentText: caption,
      media: {
        id: mediaId,
        url: normalizeText(mediaDetails?.url),
        mimeType: normalizeText(mediaDetails?.mime_type),
        fileName,
        caption,
        sha256: normalizeText(mediaDetails?.sha256),
        fileSize: typeof mediaDetails?.file_size === "number" ? mediaDetails.file_size : 0,
      },
    };
  }

  return {
    messageType: "text",
    contentText: "",
    media: null,
  };
};

const processIncomingMessage = async (input: {
  organizationContext: any;
  connection: any;
  accessToken: string;
  message: any;
  contacts?: any[];
}) => {
  const organizationId = String(input.organizationContext._id);
  const customerPhone = normalizeText(input.message?.from);
  const contactName = normalizeText(input.contacts?.[0]?.profile?.name);
  const externalMessageId = normalizeText(input.message?.id);
  const messageType = normalizeText(input.message?.type) || "text";

  whatsappLog.info("MESSAGE_RECEIVE", "Processing incoming customer message", {
    organizationId,
    phoneNumberId: input.connection.phoneNumberId,
    externalMessageId,
    messageType,
    customerPhone,
    customerName: contactName,
  });

  if (!customerPhone) {
    whatsappLog.warn("MESSAGE_RECEIVE", "Skipping message — missing customer phone", {
      organizationId,
      externalMessageId,
    });
    return;
  }

  if (input.message?.id) {
    const existing = await Message.findOne({
      organizationId,
      externalId: String(input.message.id),
    }).select("_id");

    if (existing) {
      whatsappLog.debug("MESSAGE_RECEIVE", "Duplicate message skipped", {
        organizationId,
        externalMessageId,
      });
      return;
    }
  }

  const conversation = await getOrCreateConversation({
    organizationId,
    channel: "whatsapp",
    customerPhone,
    customerName: contactName,
    metadata: {
      phoneNumberId: input.connection.phoneNumberId,
      wabaId: input.connection.wabaId,
    },
  });

  const { upsertWhatsAppContact } = require("./contact.service");
  await upsertWhatsAppContact({
    organizationId,
    phone: customerPhone,
    name: contactName,
  });

  const payload = await extractMessagePayload(input.message, input.accessToken);

  whatsappLog.debug("MESSAGE_RECEIVE", "Message payload extracted", {
    organizationId,
    externalMessageId,
    messageType: payload.messageType,
    hasText: Boolean(payload.contentText),
    hasMedia: Boolean(payload.media),
  });

  await CustomerMessage.updateOne(
    {
      organizationId,
      phoneNumberId: input.connection.phoneNumberId,
      externalId: normalizeText(input.message?.id),
    },
    {
      $setOnInsert: {
        organizationId,
        phoneNumberId: input.connection.phoneNumberId,
        wabaId: input.connection.wabaId,
        customerPhone,
        customerName: contactName,
        externalId: normalizeText(input.message?.id),
        messageType: payload.messageType,
        contentText: payload.contentText,
        media: payload.media ?? {},
        rawPayload: input.message ?? {},
      },
    },
    { upsert: true }
  );

  await appendMessage({
    organizationId,
    conversationId: String(conversation._id),
    senderType: "customer",
    messageType: payload.messageType,
    contentText: payload.contentText,
    media: payload.media ?? undefined,
    aiGenerated: false,
    externalId: normalizeText(input.message?.id),
  });

  whatsappLog.info("MESSAGE_RECEIVE", "Customer message saved and broadcast to dashboard", {
    organizationId,
    conversationId: String(conversation._id),
    externalMessageId,
    customerPhone,
  });

  // --- Hybrid Chat Management (Human Takeover) ---
  // Determine the responder type. Use the new `responderType` field first,
  // falling back to the legacy `aiEnabled` boolean for backward compatibility.
  const responderType: string =
    conversation.responderType ||
    (conversation.aiEnabled === false ? "agent" : "ai");

  if (responderType === "agent") {
    // Human agent is handling this conversation — do NOT trigger AI.
    // The message has already been persisted and streamed via WebSocket
    // by `appendMessage` (which calls emitToOrganization and emitToConversation).
    whatsappLog.info("MESSAGE_PROCESS", "Routed to human agent — AI auto-reply skipped", {
      organizationId,
      conversationId: String(conversation._id),
      responderType,
    });
    return;
  }

  // --- Multi-tenant RAG + AI auto-reply (spec section 4) ---
  if (!isAiAutoReplyEnabled(input.organizationContext)) {
    whatsappLog.info("MESSAGE_PROCESS", "AI auto-reply disabled for organization", {
      organizationId,
      conversationId: String(conversation._id),
    });
    return;
  }

  const history = await getRecentHistory({
    organizationId,
    conversationId: String(conversation._id),
  });

  const customerMessage = buildCustomerMessageText(payload.messageType, payload.contentText);

  try {
    whatsappLog.info("MESSAGE_PROCESS", "Generating AI auto-reply", {
      organizationId,
      conversationId: String(conversation._id),
      customerMessageLength: customerMessage.length,
    });

    const replyResult = await generateConversationReply({
      organization: input.organizationContext,
      message: customerMessage,
      channel: "whatsapp",
      history,
      customer: {
        id: customerPhone,
        name: contactName,
      },
    });

    await appendMessage({
      organizationId,
      conversationId: String(conversation._id),
      senderType: "assistant",
      messageType: "text",
      contentText: replyResult.reply,
      aiGenerated: true,
    });

    try {
      await AIConversation.create({
        organizationId,
        conversationId: String(conversation._id),
        channel: "whatsapp",
        customerPhone,
        prompt: customerMessage,
        reply: replyResult.reply,
        modelName: normalizeText(input.organizationContext?.aiSettings?.modelName),
        usage: {
          promptTokens: replyResult.usage.promptTokens,
          completionTokens: replyResult.usage.completionTokens,
          totalTokens: replyResult.usage.totalTokens,
        },
        externalMessageId: normalizeText(input.message?.id),
      });
    } catch (error: any) {
      console.warn(`Failed to log AI conversation: ${error?.message ?? error}`);
    }

    whatsappLog.info("MESSAGE_SEND", "Sending AI auto-reply to customer via WhatsApp", {
      organizationId,
      conversationId: String(conversation._id),
      phoneNumberId: input.connection.phoneNumberId,
      customerPhone,
      replyLength: replyResult.reply.length,
    });

    await sendWhatsAppMessageWithRetry({
      accessToken: input.accessToken,
      phoneNumberId: input.connection.phoneNumberId,
      to: customerPhone,
      text: replyResult.reply,
    });

    whatsappLog.info("MESSAGE_SEND", "AI auto-reply delivered to customer", {
      organizationId,
      conversationId: String(conversation._id),
      customerPhone,
    });
  } catch (error: any) {
    whatsappLog.error("MESSAGE_PROCESS", "AI auto-reply pipeline failed", {
      organizationId,
      conversationId: String(conversation._id),
      externalMessageId,
      error: String(error?.message ?? error),
      stack: error?.stack,
    });
  }
};

const processWebhookPayload = async (payload: any) => {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  whatsappLog.debug("WEBHOOK_PROCESS", "Processing webhook entries", {
    entryCount: entries.length,
  });

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change?.value ?? {};
      const phoneNumberId = normalizeText(value?.metadata?.phone_number_id);
      const changeField = normalizeText(change?.field);

      whatsappLog.debug("WEBHOOK_PROCESS", "Processing webhook change", {
        phoneNumberId: phoneNumberId || "(missing)",
        field: changeField,
        wabaId: normalizeText(entry?.id),
      });

      if (!phoneNumberId) {
        whatsappLog.warn("WEBHOOK_PROCESS", "Skipping change — no phone_number_id in metadata", {
          field: changeField,
        });
        continue;
      }

      let tenantContext;
      try {
        tenantContext = await loadTenantByPhoneNumberId(phoneNumberId);
      } catch (error: any) {
        whatsappLog.warn("WEBHOOK_PROCESS", "Tenant resolution failed — webhook ignored", {
          phoneNumberId,
          error: String(error?.message ?? error),
        });
        continue;
      }

      const { connection, organizationContext, accessToken } = tenantContext;

      const messages = Array.isArray(value?.messages) ? value.messages : [];
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
      const statuses = Array.isArray(value?.statuses) ? value.statuses : [];

      if (!messages.length && statuses.length) {
        for (const status of statuses) {
          whatsappLog.info("WEBHOOK_STATUS", "Delivery status update from Meta", {
            phoneNumberId,
            organizationId: String(connection.organizationId),
            messageId: normalizeText(status?.id),
            status: normalizeText(status?.status),
            recipientPhone: normalizeText(status?.recipient_id),
            timestamp: status?.timestamp ?? null,
            errors: status?.errors ?? null,
          });
        }
      }

      if (!messages.length && !statuses.length) {
        whatsappLog.debug("WEBHOOK_PROCESS", "No messages or statuses in payload", {
          phoneNumberId,
          field: changeField,
        });
      }

      for (const message of messages) {
        try {
          const externalId = normalizeText(message?.id);
          if (!externalId) {
            continue;
          }

          const existingLog = await WebhookLog.findOne({
            externalId,
            phoneNumberId,
            status: "processed",
          }).select("_id");

          if (existingLog) {
            continue;
          }

          await WebhookLog.updateOne(
            { externalId, phoneNumberId },
            {
              $setOnInsert: {
                organizationId: connection.organizationId,
                phoneNumberId,
                wabaId: connection.wabaId,
                externalId,
                eventType: normalizeText(message?.type) || "message",
                status: "received",
                payload: message ?? {},
              },
            },
            { upsert: true }
          );

          await processIncomingMessage({
            organizationContext,
            connection,
            accessToken,
            message,
            contacts,
          });

          await WebhookLog.updateOne(
            { externalId, phoneNumberId },
            { $set: { status: "processed", errorMessage: "" } }
          );

          whatsappLog.info("MESSAGE_RECEIVE", "Webhook message processed successfully", {
            phoneNumberId,
            organizationId: String(connection.organizationId),
            externalId,
          });
        } catch (error: any) {
          const externalId = normalizeText(message?.id);
          if (externalId) {
            await WebhookLog.updateOne(
              { externalId, phoneNumberId },
              {
                $set: {
                  status: "failed",
                  errorMessage: String(error?.message ?? error),
                },
              }
            );
          }
          whatsappLog.error("MESSAGE_RECEIVE", "Failed to process incoming message", {
            phoneNumberId,
            organizationId: String(connection.organizationId),
            externalId: externalId || message?.id,
            messageType: normalizeText(message?.type),
            error: String(error?.message ?? error),
            stack: error?.stack,
          });
        }
      }
    }
  }
};

module.exports = {
  processWebhookPayload,
  sendWhatsAppMessageWithRetry,
};

export {};
