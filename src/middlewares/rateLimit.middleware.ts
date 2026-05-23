import { Request } from "express";
import rateLimit from "express-rate-limit";

import { getApiKeyPrefix } from "../utils/generateApiKey";

const resolveRateLimitKey = (req: Request) => {
  const apiKeyHeader = req.headers["x-api-key"];

  if (typeof apiKeyHeader === "string") {
    const prefix = getApiKeyPrefix(apiKeyHeader.trim());
    if (prefix) {
      return `api:${prefix}`;
    }
  }

  const orgId =
    (req as any).organizationId ||
    (req as any).user?.organizationId ||
    (req as any).user?.company;

  if (typeof orgId === "string" && orgId.trim()) {
    return `org:${orgId}`;
  }

  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
};

const buildLimiter = (options: { windowMs: number; max: number }) =>
  rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: resolveRateLimitKey,
  });

export const generalApiLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
});

export const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
});

export const aiLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 30,
});

export const webhookLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 120,
});

export const uploadLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
});
