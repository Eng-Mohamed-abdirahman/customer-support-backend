const Organization = require("../models/Organization");
const Message = require("../models/Message");
const WebhookLog = require("../models/WebhookLog");
const CustomerMessage = require("../models/CustomerMessage");
const AIConversation = require("../models/AIConversation");

const { env } = require("../config/env");
const { AppError } = require("../utils/appError");
const { decryptApiKey } = require("../utils/cryptoApiKey");
const { getApiKeyPrefix } = require("../utils/generateApiKey");
const { generateConversationReply } = require("./conversation.service");
const {
  getOrCreateConversation,
  appendMessage,
  getRecentHistory,
} = require("./conversationStore.service");
const {
  getConnectionByPhoneNumberId,
  resolveAccessToken,
} = require("./whatsapp.service");
const { sendWhatsAppTextMessage } = require("./whatsappGraph.service");
const { apiKeyOrganizationSelect } = require("../middlewares/validateApiKey.middleware");

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
    try {
      return await sendWhatsAppTextMessage(input);
    } catch (error) {
      attempt += 1;
      if (attempt >= maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * Math.pow(2, attempt)));
    }
  }
};

const resolveOrganizationApiKey = async (organization: any) => {
  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  if (organization.status === "suspended" || organization.status === "cancelled") {
    throw new AppError("Organization is not active", 403);
  }

  const candidates: Array<{
    keyPrefix: string;
    encryptedKey: string;
    iv: string;
    record?: any;
  }> = [];

  if (organization?.api_settings?.encrypted_key && organization?.api_settings?.iv) {
    candidates.push({
      keyPrefix: organization.api_settings.key_prefix,
      encryptedKey: organization.api_settings.encrypted_key,
      iv: organization.api_settings.iv,
    });
  }

  if (organization?.apiSettings?.encryptedKey && organization?.apiSettings?.iv) {
    candidates.push({
      keyPrefix: organization.apiSettings.keyPrefix,
      encryptedKey: organization.apiSettings.encryptedKey,
      iv: organization.apiSettings.iv,
    });
  }

  if (Array.isArray(organization.api_keys)) {
    organization.api_keys.forEach((record: any) => {
      if (!record?.encrypted_key || !record?.iv || record?.revoked_at) {
        return;
      }

      candidates.push({
        keyPrefix: record.key_prefix,
        encryptedKey: record.encrypted_key,
        iv: record.iv,
        record,
      });
    });
  }

  for (const candidate of candidates) {
    try {
      const decrypted = decryptApiKey(candidate.encryptedKey, candidate.iv);
      const prefix = getApiKeyPrefix(decrypted);

      if (!prefix || prefix.length < 16) {
        continue;
      }

      if (candidate.keyPrefix && candidate.keyPrefix !== prefix) {
        continue;
      }

      if (candidate.record) {
        candidate.record.last_used_at = new Date();
        await organization.save();
      }

      return decrypted;
    } catch {
      continue;
    }
  }

  throw new AppError("Invalid API key for organization", 401);
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
  knowledgeBaseReference: organization?.knowledgeBaseReference ?? "",
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
  organization: any;
  connection: any;
  accessToken: string;
  message: any;
  contacts?: any[];
}) => {
  const organizationId = String(input.organization._id);
  const customerPhone = normalizeText(input.message?.from);
  const contactName = normalizeText(input.contacts?.[0]?.profile?.name);

  if (!customerPhone) {
    return;
  }

  if (input.message?.id) {
    const existing = await Message.findOne({
      organizationId,
      externalId: String(input.message.id),
    }).select("_id");

    if (existing) {
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

  const payload = await extractMessagePayload(input.message, input.accessToken);

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

  if (!conversation.aiEnabled) {
    return;
  }

  const aiEnabled = Boolean(input.organization?.aiSettings?.aiEnabled ?? true);
  const autoReplyEnabled = Boolean(input.organization?.aiSettings?.autoReplyEnabled ?? true);
  const allowedChannels = Array.isArray(input.organization?.allowedChannels)
    ? input.organization.allowedChannels
    : ["website"];

  const whatsappAllowed = allowedChannels
    .map((channel: any) => normalizeText(channel).toLowerCase())
    .includes("whatsapp");

  if (!aiEnabled || !autoReplyEnabled || !whatsappAllowed) {
    return;
  }

  await resolveOrganizationApiKey(input.organization);

  const history = await getRecentHistory({
    organizationId,
    conversationId: String(conversation._id),
  });

  const customerMessage = buildCustomerMessageText(payload.messageType, payload.contentText);

  const replyResult = await generateConversationReply({
    organization: toConversationOrganizationContext(input.organization),
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
      modelName: normalizeText(input.organization?.aiSettings?.modelName),
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

  await sendWhatsAppMessageWithRetry({
    accessToken: input.accessToken,
    phoneNumberId: input.connection.phoneNumberId,
    to: customerPhone,
    text: replyResult.reply,
  });
};

const processWebhookPayload = async (payload: any) => {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change?.value ?? {};
      const phoneNumberId = normalizeText(value?.metadata?.phone_number_id);

      if (!phoneNumberId) {
        continue;
      }

      const connection = await getConnectionByPhoneNumberId(phoneNumberId);

      if (!connection) {
        console.warn(`WhatsApp webhook ignored: no connection for ${phoneNumberId}`);
        continue;
      }

      const accessToken = resolveAccessToken(connection);
      const organization = await Organization.findById(connection.organizationId).select(
        apiKeyOrganizationSelect
      );

      if (!organization) {
        console.warn(`WhatsApp webhook ignored: organization missing for ${phoneNumberId}`);
        continue;
      }

      const messages = Array.isArray(value?.messages) ? value.messages : [];
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];

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
            organization,
            connection,
            accessToken,
            message,
            contacts,
          });

          await WebhookLog.updateOne(
            { externalId, phoneNumberId },
            { $set: { status: "processed", errorMessage: "" } }
          );
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
          console.error(
            `Failed to process WhatsApp message ${message?.id ?? ""}: ${error?.message ?? error}`
          );
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
