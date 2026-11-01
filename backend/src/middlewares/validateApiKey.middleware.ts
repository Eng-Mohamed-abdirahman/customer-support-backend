import { NextFunction, Request, Response } from "express";

import Organization from "../models/Organization";

import { AppError } from "../utils/appError";
import { getApiKeyPrefix, verifyApiKey } from "../utils/generateApiKey";
import { decryptApiKey } from "../utils/cryptoApiKey";

const apiKeyOrganizationSelect =
  "_id status createdBy profile contact businessInfo supportSettings aiSettings allowedChannels" +
  " api_settings.total_tokens_used api_settings.monthly_limit api_settings.last_key_rotated_at" +
  " +api_settings.encrypted_key" +
  " +api_settings.iv" +
  " +apiSettings.encryptedKey" +
  " +apiSettings.iv" +
  " api_keys.name api_keys.key_prefix api_keys.created_at api_keys.last_used_at api_keys.last_revealed_at api_keys.revoked_at" +
  " +api_keys.encrypted_key" +
  " +api_keys.iv";

const extractApiKey = (req: Request): string | null => {
  const headerValue = req.headers["x-api-key"];

  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  if (Array.isArray(headerValue) && headerValue.length > 0) {
    const first = headerValue[0]?.trim();
    return first || null;
  }

  return null;
};

const sanitizeOrganizationForRequest = (organization: any) => {
  const plainOrganization =
    typeof organization?.toObject === "function" ? organization.toObject() : { ...organization };

  if (plainOrganization?.api_settings) {
    delete plainOrganization.api_settings.encrypted_key;
    delete plainOrganization.api_settings.iv;
  }

  if (plainOrganization?.apiSettings) {
    delete plainOrganization.apiSettings.encryptedKey;
    delete plainOrganization.apiSettings.iv;
  }

  if (Array.isArray(plainOrganization?.api_keys)) {
    plainOrganization.api_keys = plainOrganization.api_keys.map((record: any) => {
      if (record && typeof record === "object") {
        const sanitized = { ...record };
        delete sanitized.encrypted_key;
        delete sanitized.iv;
        return sanitized;
      }

      return record;
    });
  }

  return plainOrganization;
};

const validateApiKey = async (req: Request, _res: Response, next: NextFunction) => {
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    return next(new AppError("Missing API key", 401));
  }

  const keyPrefix = getApiKeyPrefix(apiKey);

  if (!keyPrefix || keyPrefix.length < 16) {
    return next(new AppError("Invalid API key", 401));
  }

  const organization = await Organization.findOne({
    $or: [
      { "api_settings.key_prefix": keyPrefix },
      { "apiSettings.keyPrefix": keyPrefix },
    ],
  }).select(apiKeyOrganizationSelect);

  const keyRecord = Array.isArray(organization?.api_keys)
    ? organization.api_keys.find((record: any) => record?.key_prefix === keyPrefix)
    : null;

  if (keyRecord?.revoked_at) {
    return next(new AppError("Invalid API key", 401));
  }

  const storedEncryptedKey =
    keyRecord?.encrypted_key ??
    organization?.api_settings?.encrypted_key ??
    organization?.get?.("apiSettings.encryptedKey");
    
  const storedIv =
    keyRecord?.iv ??
    organization?.api_settings?.iv ??
    organization?.get?.("apiSettings.iv");

  if (!organization || typeof storedEncryptedKey !== "string" || storedEncryptedKey.length === 0 || typeof storedIv !== "string") {
    return next(new AppError("Invalid API key", 401));
  }

  let isValidApiKey = false;
  try {
    const dec = decryptApiKey(storedEncryptedKey, storedIv);
    if (dec === apiKey) {
      isValidApiKey = true;
    }
  } catch (error) {
    isValidApiKey = false;
  }

  if (!isValidApiKey) {
    return next(new AppError("Invalid API key", 401));
  }

  if (keyRecord) {
    keyRecord.last_used_at = new Date();
    await organization.save();
  }

  if (organization.status === "suspended" || organization.status === "cancelled") {
    return next(new AppError("Organization is not active", 403));
  }

  (req as any).organization = sanitizeOrganizationForRequest(organization);
  (req as any).organizationId = String(organization._id);

  next();
};

export {
  validateApiKey,
  apiKeyOrganizationSelect,
};

