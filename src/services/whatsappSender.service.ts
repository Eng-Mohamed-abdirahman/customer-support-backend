import axios from "axios";
import { env } from "../config/env";
import { decryptApiKey } from "../utils/cryptoApiKey";
import { AppError } from "../utils/appError";

const WhatsAppConnection = require("../models/WhatsAppConnection");

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
  if (!accountId) {
    throw new AppError("Account ID is required to resolve WhatsApp configuration", 400);
  }

  if (!receiverPhone) {
    throw new AppError("Receiver phone number is required", 400);
  }

  // Fetch active WhatsApp configuration for the organization (tenant)
  const connection = await WhatsAppConnection.findOne({
    organizationId: accountId,
    status: { $ne: "disconnected" },
  }).select("+accessTokenEncrypted +accessTokenIv");

  if (!connection) {
    throw new AppError("Active WhatsApp configuration not found for this organization", 404);
  }

  if (!connection.accessTokenEncrypted || !connection.accessTokenIv) {
    throw new AppError("WhatsApp access token is missing or not configured", 400);
  }

  // Decrypt the access token (GCM decryption is handled automatically by decryptApiKey)
  let accessToken: string;
  try {
    accessToken = decryptApiKey(connection.accessTokenEncrypted, connection.accessTokenIv);
  } catch (error: any) {
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

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error: any) {
    const errorMsg = error.response?.data
      ? typeof error.response.data === "object"
        ? JSON.stringify(error.response.data)
        : String(error.response.data)
      : error.message;
    throw new AppError(`WhatsApp Graph API error: ${errorMsg}`, error.response?.status || 500);
  }
};
