/**
 * Ensures Meta delivers inbound WhatsApp messages to our webhook.
 * Requires: app subscribed to "messages" field + app subscribed to each WABA.
 */
const WhatsAppConnection = require("../models/WhatsAppConnection");

const { env } = require("../config/env");
const { AppError } = require("../utils/appError");
const { whatsappLog } = require("../utils/whatsappLogger");
const {
  listConnectionsByOrganizationId,
  markWebhookSubscription,
  resolveAccessToken,
  resolveVerifyToken,
} = require("./whatsapp.service");
const {
  ensureAppSubscribedToWaba,
  subscribeAppWebhookFields,
  getAppWebhookSubscriptions,
  getWabaSubscribedApps,
} = require("./whatsappGraph.service");

const buildCallbackUrl = () => `${env.publicApiUrl.replace(/\/$/, "")}/api/webhooks/whatsapp`;

const isPublicCallbackUrl = (url: string) => !/localhost|127\.0\.0\.1/i.test(url);

const ensureInboundWebhooks = async (
  organizationId: string,
  options?: { verifyToken?: string }
) => {
  const callbackUrl = buildCallbackUrl();

  whatsappLog.info("WEBHOOK_SETUP", "Starting inbound webhook setup", {
    organizationId,
    callbackUrl,
    callbackIsPublic: isPublicCallbackUrl(callbackUrl),
  });

  if (!isPublicCallbackUrl(callbackUrl)) {
    throw new AppError(
      "PUBLIC_API_URL must be a public URL reachable by Meta (not localhost). Use ngrok or set PUBLIC_API_URL on the backend.",
      400
    );
  }

  if (!env.WHATSAPP_APP_ID || !env.WHATSAPP_APP_SECRET) {
    throw new AppError("WHATSAPP_APP_ID and WHATSAPP_APP_SECRET must be configured on the backend", 500);
  }

  const connections = await listConnectionsByOrganizationId(organizationId);
  const activeConnections = connections.filter((connection: any) => connection.status !== "disconnected");

  if (!activeConnections.length) {
    throw new AppError("No active WhatsApp connections found for this organization", 404);
  }

  let verifyToken = normalizeText(options?.verifyToken);
  if (!verifyToken) {
    const connectionWithVerify = await WhatsAppConnection.findOne({
      organizationId,
      status: { $ne: "disconnected" },
    }).select("+verifyTokenEncrypted +verifyTokenIv");

    verifyToken = resolveVerifyToken(connectionWithVerify);
  }

  try {
    await subscribeAppWebhookFields({
      callbackUrl,
      verifyToken,
      fields: ["messages"],
    });
    whatsappLog.info("WEBHOOK_SETUP", "App subscribed to messages webhook field", {
      organizationId,
      callbackUrl,
    });
  } catch (error: any) {
    whatsappLog.error("WEBHOOK_SETUP", "Failed to subscribe app to messages field", {
      organizationId,
      callbackUrl,
      error: String(error?.message ?? error),
    });
    throw error;
  }

  const subscribedWabas = new Set<string>();
  const results: Array<{
    phoneNumberId: string;
    wabaId: string;
    status: "subscribed" | "failed";
    error?: string;
  }> = [];

  for (const connection of activeConnections) {
    const wabaId = normalizeText(connection.wabaId);
    const phoneNumberId = normalizeText(connection.phoneNumberId);

    if (!wabaId || !phoneNumberId) {
      continue;
    }

    try {
      if (!subscribedWabas.has(wabaId)) {
        const connectionWithToken = await WhatsAppConnection.findOne({
          phoneNumberId: connection.phoneNumberId,
          status: { $ne: "disconnected" },
        }).select("+accessTokenEncrypted +accessTokenIv");

        const accessToken = resolveAccessToken(connectionWithToken);
        await ensureAppSubscribedToWaba({ wabaId, accessToken });
        subscribedWabas.add(wabaId);

        whatsappLog.info("WEBHOOK_SETUP", "WABA webhook subscription verified", {
          organizationId,
          wabaId,
          phoneNumberId,
        });
      }

      await markWebhookSubscription({
        organizationId,
        phoneNumberId,
        status: "subscribed",
      });

      results.push({ phoneNumberId, wabaId, status: "subscribed" });
    } catch (error: any) {
      const errorMessage = String(error?.message ?? error);

      await markWebhookSubscription({
        organizationId,
        phoneNumberId,
        status: "failed",
        error: errorMessage,
      });

      whatsappLog.error("WEBHOOK_SETUP", "WABA webhook subscription failed", {
        organizationId,
        wabaId,
        phoneNumberId,
        error: errorMessage,
      });

      results.push({ phoneNumberId, wabaId, status: "failed", error: errorMessage });
    }
  }

  let metaSubscriptions: Awaited<ReturnType<typeof getAppWebhookSubscriptions>> | null = null;
  try {
    metaSubscriptions = await getAppWebhookSubscriptions();
  } catch (error: any) {
    whatsappLog.warn("WEBHOOK_SETUP", "Could not read Meta webhook subscription status", {
      organizationId,
      error: String(error?.message ?? error),
    });
  }

  const allSucceeded = results.every((result) => result.status === "subscribed");

  whatsappLog.info("WEBHOOK_SETUP", "Inbound webhook setup finished", {
    organizationId,
    allSucceeded,
    messagesFieldSubscribed: metaSubscriptions?.messagesSubscribed ?? null,
    metaCallbackUrl: metaSubscriptions?.callbackUrl ?? null,
  });

  return {
    callbackUrl,
    results,
    metaSubscriptions,
    allSucceeded,
  };
};

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const fetchMetaWebhookDiagnostics = async () => {
  try {
    return await getAppWebhookSubscriptions();
  } catch (error: any) {
    return {
      active: false,
      callbackUrl: null,
      fields: [],
      messagesSubscribed: false,
      error: String(error?.message ?? error),
      raw: null,
    };
  }
};

const repairWabaSubscriptionsForActiveConnections = async () => {
  const connections = await WhatsAppConnection.find({
    status: { $ne: "disconnected" },
  }).select("+accessTokenEncrypted +accessTokenIv wabaId phoneNumberId organizationId");

  const seenWabas = new Set<string>();
  const results: Array<{ wabaId: string; status: string; error?: string }> = [];

  for (const connection of connections) {
    const wabaId = normalizeText(connection.wabaId);
    if (!wabaId || seenWabas.has(wabaId)) {
      continue;
    }

    seenWabas.add(wabaId);

    try {
      const accessToken = resolveAccessToken(connection);
      const before = await getWabaSubscribedApps({ wabaId, accessToken });

      if (!before.subscribed) {
        await ensureAppSubscribedToWaba({ wabaId, accessToken });
        results.push({ wabaId, status: "repaired" });
      } else {
        results.push({ wabaId, status: "ok" });
      }
    } catch (error: any) {
      results.push({
        wabaId,
        status: "failed",
        error: String(error?.message ?? error),
      });
    }
  }

  return results;
};

module.exports = {
  buildCallbackUrl,
  isPublicCallbackUrl,
  ensureInboundWebhooks,
  fetchMetaWebhookDiagnostics,
  repairWabaSubscriptionsForActiveConnections,
};

export {};
