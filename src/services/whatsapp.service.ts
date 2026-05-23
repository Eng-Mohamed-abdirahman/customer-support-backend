const crypto = require("crypto");

const WhatsAppConnection = require("../models/WhatsAppConnection");

const { encryptApiKey, decryptApiKey } = require("../utils/cryptoApiKey");
const { AppError } = require("../utils/appError");

const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const toConnectionResponse = (connection: any) => {
  if (!connection) {
    return null;
  }

  const plain = typeof connection.toObject === "function" ? connection.toObject() : connection;

  return {
    id: String(plain._id),
    organizationId: String(plain.organizationId),
    wabaId: plain.wabaId,
    businessName: plain.businessName,
    phoneNumberId: plain.phoneNumberId,
    displayPhoneNumber: plain.displayPhoneNumber,
    status: plain.status,
    webhookSubscriptionStatus: plain.webhookSubscriptionStatus,
    webhookSubscribedAt: plain.webhookSubscribedAt,
    accessTokenExpiresAt: plain.accessTokenExpiresAt,
    connectedAt: plain.connectedAt,
    disconnectedAt: plain.disconnectedAt,
    lastVerifiedAt: plain.lastVerifiedAt,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

const upsertConnection = async (input: {
  organizationId: string;
  wabaId: string;
  businessName?: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  accessToken: string;
  accessTokenExpiresAt?: Date | null;
  verifyToken: string;
  webhookSubscriptionStatus?: "subscribed" | "pending" | "failed" | "unknown";
  webhookSubscribedAt?: Date | null;
  lastWebhookError?: string;
}) => {
  const accessEncrypted = encryptApiKey(input.accessToken);
  const verifyEncrypted = encryptApiKey(input.verifyToken);
  const verifyTokenHash = hashToken(input.verifyToken);

  const connection = await WhatsAppConnection.findOneAndUpdate(
    { organizationId: input.organizationId, phoneNumberId: input.phoneNumberId },
    {
      wabaId: input.wabaId,
      businessName: input.businessName ?? "",
      phoneNumberId: input.phoneNumberId,
      displayPhoneNumber: input.displayPhoneNumber ?? "",
      accessTokenEncrypted: accessEncrypted.encryptedKey,
      accessTokenIv: accessEncrypted.iv,
      accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
      verifyTokenEncrypted: verifyEncrypted.encryptedKey,
      verifyTokenIv: verifyEncrypted.iv,
      verifyTokenHash,
      webhookSubscriptionStatus: input.webhookSubscriptionStatus ?? "unknown",
      webhookSubscribedAt: input.webhookSubscribedAt ?? null,
      lastWebhookError: input.lastWebhookError ?? "",
      status: "connected",
      connectedAt: new Date(),
      disconnectedAt: null,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return connection;
};

const listConnectionsByOrganizationId = async (organizationId: string) => {
  return WhatsAppConnection.find({ organizationId }).sort({ createdAt: -1 });
};

const disconnectConnection = async (organizationId: string, phoneNumberId: string) => {
  return WhatsAppConnection.findOneAndUpdate(
    { organizationId, phoneNumberId },
    {
      status: "disconnected",
      disconnectedAt: new Date(),
      accessTokenEncrypted: null,
      accessTokenIv: null,
      accessTokenExpiresAt: null,
      verifyTokenEncrypted: null,
      verifyTokenIv: null,
      verifyTokenHash: null,
    },
    { new: true }
  );
};

const getConnectionByVerifyToken = async (verifyToken: string) => {
  const verifyTokenHash = hashToken(verifyToken);

  return WhatsAppConnection.findOne({
    verifyTokenHash,
    status: { $ne: "disconnected" },
  });
};

const getConnectionByPhoneNumberId = async (phoneNumberId: string) => {
  return WhatsAppConnection.findOne({
    phoneNumberId,
    status: { $ne: "disconnected" },
  }).select("+accessTokenEncrypted +accessTokenIv");
};

const markWebhookSubscription = async (input: {
  organizationId: string;
  phoneNumberId: string;
  status: "subscribed" | "pending" | "failed" | "unknown";
  error?: string;
}) => {
  return WhatsAppConnection.findOneAndUpdate(
    { organizationId: input.organizationId, phoneNumberId: input.phoneNumberId },
    {
      webhookSubscriptionStatus: input.status,
      webhookSubscribedAt: input.status === "subscribed" ? new Date() : null,
      lastWebhookError: input.error ?? "",
    },
    { new: true }
  );
};

const resolveAccessToken = (connection: any): string => {
  if (!connection?.accessTokenEncrypted || !connection?.accessTokenIv) {
    throw new AppError("WhatsApp access token is missing", 400);
  }

  return decryptApiKey(connection.accessTokenEncrypted, connection.accessTokenIv);
};

module.exports = {
  toConnectionResponse,
  upsertConnection,
  listConnectionsByOrganizationId,
  disconnectConnection,
  getConnectionByVerifyToken,
  getConnectionByPhoneNumberId,
  resolveAccessToken,
  markWebhookSubscription,
};

export {};
