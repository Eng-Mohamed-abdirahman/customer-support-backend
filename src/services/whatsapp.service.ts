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
    phoneNumberId: plain.phoneNumberId,
    businessAccountId: plain.businessAccountId,
    status: plain.status,
    connectedAt: plain.connectedAt,
    disconnectedAt: plain.disconnectedAt,
    lastVerifiedAt: plain.lastVerifiedAt,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

const upsertConnection = async (input: {
  organizationId: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  verifyToken: string;
}) => {
  const accessEncrypted = encryptApiKey(input.accessToken);
  const verifyEncrypted = encryptApiKey(input.verifyToken);
  const verifyTokenHash = hashToken(input.verifyToken);

  const connection = await WhatsAppConnection.findOneAndUpdate(
    { organizationId: input.organizationId },
    {
      phoneNumberId: input.phoneNumberId,
      businessAccountId: input.businessAccountId,
      accessTokenEncrypted: accessEncrypted.encryptedKey,
      accessTokenIv: accessEncrypted.iv,
      verifyTokenEncrypted: verifyEncrypted.encryptedKey,
      verifyTokenIv: verifyEncrypted.iv,
      verifyTokenHash,
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

const getConnectionByOrganizationId = async (organizationId: string) => {
  return WhatsAppConnection.findOne({ organizationId });
};

const disconnectConnection = async (organizationId: string) => {
  return WhatsAppConnection.findOneAndUpdate(
    { organizationId },
    {
      status: "disconnected",
      disconnectedAt: new Date(),
      accessTokenEncrypted: null,
      accessTokenIv: null,
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

const resolveAccessToken = (connection: any): string => {
  if (!connection?.accessTokenEncrypted || !connection?.accessTokenIv) {
    throw new AppError("WhatsApp access token is missing", 400);
  }

  return decryptApiKey(connection.accessTokenEncrypted, connection.accessTokenIv);
};

module.exports = {
  toConnectionResponse,
  upsertConnection,
  getConnectionByOrganizationId,
  disconnectConnection,
  getConnectionByVerifyToken,
  getConnectionByPhoneNumberId,
  resolveAccessToken,
};

export {};
