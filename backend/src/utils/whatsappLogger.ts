import { createLogger } from "./logger";

type LogLevel = "info" | "warn" | "error" | "debug";

type WhatsAppLogContext = Record<string, unknown>;

const maskToken = (token: unknown): string => {
  if (typeof token !== "string" || !token) {
    return "(missing)";
  }

  if (token.length <= 12) {
    return "***";
  }

  return `${token.slice(0, 6)}...${token.slice(-4)}`;
};

const maskPhone = (phone: unknown): string => {
  if (typeof phone !== "string" || !phone) {
    return "(missing)";
  }

  if (phone.length <= 4) {
    return "***";
  }

  return `***${phone.slice(-4)}`;
};

const sanitizeContext = (context: WhatsAppLogContext): WhatsAppLogContext => {
  const sanitized: WhatsAppLogContext = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();

    if (
      (lowerKey.includes("token") && !lowerKey.startsWith("has")) ||
      lowerKey.includes("secret") ||
      lowerKey === "authorization"
    ) {
      sanitized[key] = maskToken(value as string);
      continue;
    }

    if (
      (lowerKey.includes("phone") || lowerKey === "to" || lowerKey === "from") &&
      lowerKey !== "phonenumberid"
    ) {
      sanitized[key] = maskPhone(value as string);
      continue;
    }

    if (key === "text" && typeof value === "string" && value.length > 120) {
      sanitized[key] = `${value.slice(0, 120)}... (${value.length} chars)`;
      continue;
    }

    if (key === "body" && typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeContext(value as WhatsAppLogContext);
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
};

const baseLogger = createLogger("WhatsApp");

const log = (level: LogLevel, stage: string, message: string, context?: WhatsAppLogContext) => {
  const sanitized = context && Object.keys(context).length > 0 ? sanitizeContext(context) : undefined;
  baseLogger.child(stage)[level](message, sanitized);
};

export const whatsappLog = {
  info: (stage: string, message: string, context?: WhatsAppLogContext) => log("info", stage, message, context),
  warn: (stage: string, message: string, context?: WhatsAppLogContext) => log("warn", stage, message, context),
  error: (stage: string, message: string, context?: WhatsAppLogContext) => log("error", stage, message, context),
  debug: (stage: string, message: string, context?: WhatsAppLogContext) => log("debug", stage, message, context),
  maskToken,
  maskPhone,
};
