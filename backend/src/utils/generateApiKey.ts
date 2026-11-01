import crypto from "crypto";
import bcrypt from "bcryptjs";

const API_KEY_PREFIX = "sk_live_";
const API_KEY_PREFIX_LENGTH = 16;

export const generateApiKey = () => {
  const randomPart = crypto.randomBytes(24).toString("hex");
  return `${API_KEY_PREFIX}${randomPart}`;
};

export const getApiKeyPrefix = (apiKey: string) => {
  if (typeof apiKey !== "string") {
    return "";
  }

  return apiKey.trim().slice(0, API_KEY_PREFIX_LENGTH);
};

export const hashApiKey = async (apiKey: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(apiKey.trim(), salt);
};

export const verifyApiKey = async (apiKey: string, hash: string) => {
  return bcrypt.compare(apiKey.trim(), hash);
};