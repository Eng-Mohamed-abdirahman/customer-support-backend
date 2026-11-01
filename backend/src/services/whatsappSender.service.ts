import axios from "axios";
import { env } from "../config/env";
import { decryptApiKey } from "../utils/cryptoApiKey";
import { AppError } from "../utils/appError";
import { whatsappLog } from "../utils/whatsappLogger";

import WhatsAppConnection from "../models/WhatsAppConnection";
import { getErrorCode, getErrorMessage } from "../utils/errors";

const graphBaseUrl = env.WHATSAPP_GRAPH_BASE_URL || "https://graph.facebook.com";
const graphVersion = "v21.0"; // Using v21.0 as specified in the migration guide

/**
 * Sends a message dynamically to a customer using the organization's WhatsApp configuration.
 * 
 * @param accountId - The tenant's organization ID.
 * @param receiverPhone - The customer's phone number in E.164 format.
 * @param messageData - String (for text message body) or Object (for templates, media, interactive, etc.).
 */
export const sendMessage = async (
  accountId: string,
  receiverPhone: string,
  messageData: any
) => {
  whatsappLog.info("AGENT_SEND", "Dashboard send message requested", {
    organizationId: accountId,
    receiverPhone,
    messageType: typeof messageData === "string" ? "text" : "custom",
  });

  if (!accountId) {
    whatsappLog.warn("AGENT_SEND", "Missing organization ID");
    throw new AppError("Account ID is required to resolve WhatsApp configuration", 400);
  }

  if (!receiverPhone) {
    whatsappLog.warn("AGENT_SEND", "Missing receiver phone", { organizationId: accountId });
    throw new AppError("Receiver phone number is required", 400);
  }

  // Fetch active WhatsApp configuration for the organization (tenant)
  const connection = await WhatsAppConnection.findOne({
    organizationId: accountId,
    status: { $ne: "disconnected" },
  }).select("+accessTokenEncrypted +accessTokenIv");

  if (!connection) {
    whatsappLog.error("AGENT_SEND", "No active WhatsApp connection for organization", {
      organizationId: accountId,
    });
    throw new AppError("Active WhatsApp configuration not found for this organization", 404);
  }

  whatsappLog.debug("AGENT_SEND", "WhatsApp connection resolved", {
    organizationId: accountId,
    phoneNumberId: connection.phoneNumberId,
    wabaId: connection.wabaId,
    status: connection.status,
    displayPhoneNumber: connection.displayPhoneNumber,
  });

  if (!connection.accessTokenEncrypted || !connection.accessTokenIv) {
    whatsappLog.error("AGENT_SEND", "Access token not configured on connection", {
      organizationId: accountId,
      phoneNumberId: connection.phoneNumberId,
    });
    throw new AppError("WhatsApp access token is missing or not configured", 400);
  }

  // Decrypt the access token (GCM decryption is handled automatically by decryptApiKey)
  let accessToken: string;
  try {
    accessToken = decryptApiKey(connection.accessTokenEncrypted, connection.accessTokenIv);
    whatsappLog.debug("AGENT_SEND", "Access token decrypted", {
      organizationId: accountId,
      accessToken,
    });
  } catch (error) {
    whatsappLog.error("AGENT_SEND", "Failed to decrypt access token", {
      organizationId: accountId,
      phoneNumberId: connection.phoneNumberId,
      error: String(getErrorMessage(error) ?? error),
    });
    throw new AppError("Failed to decrypt WhatsApp access token", 500);
  }

  // Build the message payload
  let payload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: receiverPhone,
  };

  if (typeof messageData === "string") {
    payload.type = "text";
    payload.text = { body: messageData };
  } else {
    payload = {
      ...payload,
      ...messageData,
    };
  }

  const url = `${graphBaseUrl}/${graphVersion}/${connection.phoneNumberId}/messages`;

  whatsappLog.info("AGENT_SEND", "Calling Meta Graph API to send message", {
    organizationId: accountId,
    phoneNumberId: connection.phoneNumberId,
    receiverPhone,
    graphVersion,
    url,
    payloadType: payload.type ?? "custom",
    text: typeof messageData === "string" ? messageData : undefined,
  });

  const startMs = Date.now();

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    whatsappLog.info("AGENT_SEND", "Message sent to Meta successfully", {
      organizationId: accountId,
      phoneNumberId: connection.phoneNumberId,
      receiverPhone,
      graphMessageId: response.data?.messages?.[0]?.id ?? null,
      durationMs: Date.now() - startMs,
    });

    return response.data;
  } catch (error) {
    const response = axios.isAxiosError(error) ? error.response : undefined;
    const errorMsg = response?.data
      ? typeof response.data === "object"
        ? JSON.stringify(response.data)
        : String(response.data)
      : getErrorMessage(error);

    whatsappLog.error("AGENT_SEND", "Meta Graph API rejected the message", {
      organizationId: accountId,
      phoneNumberId: connection.phoneNumberId,
      receiverPhone,
      status: response?.status ?? null,
      error: errorMsg,
      durationMs: Date.now() - startMs,
    });

    throw new AppError(`WhatsApp Graph API error: ${errorMsg}`, response?.status || 500);
  }
};
