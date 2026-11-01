import { Request, Response } from "express";
import crypto from "crypto";

import mongoose from "mongoose";
import Organization from "../models/Organization";
import { env } from "../config/env";

import { apiResponse } from "../utils/apiResponse";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { connectWhatsAppSchema, embeddedSignupSchema } from "../validators/whatsapp.validator";
import { upsertConnection, listConnectionsByOrganizationId, disconnectConnection, toConnectionResponse, markWebhookSubscription } from "../services/whatsapp.service";
import { exchangeCodeForToken, exchangeForLongLivedToken, fetchOwnedWabaAccounts, ensureAppSubscribedToWaba } from "../services/whatsappGraph.service";
import { whatsappLog } from "../utils/whatsappLogger";
import { ensureInboundWebhooks, fetchMetaWebhookDiagnostics, isPublicCallbackUrl, buildCallbackUrl } from "../services/whatsappWebhookSetup.service";
import { probeUrl } from "../services/whatsappWebhookStartup.service";
import WebhookLog from "../models/WebhookLog";
import { getErrorCode, getErrorMessage } from "../utils/errors";

type AuthenticatedUser = {
  _id: string;
  role?: string;
  company?: string | null;
  organizationId?: string | null;
};

const resolveOrganizationId = (req: Request): string => {
  const user = req.user as AuthenticatedUser | undefined;

  if (user?.role === "admin") {
    const targetOrgId =
      req.headers["x-organization-id"] ||
      req.query.organizationId ||
      req.body.organizationId;
    if (targetOrgId && mongoose.Types.ObjectId.isValid(targetOrgId)) {
      return String(targetOrgId);
    }
  }

  const organizationId = user?.organizationId ?? user?.company;

  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new AppError("Organization context is missing for this user", 400);
  }

  return String(organizationId);
};

const parseConnectPayload = (req: Request) => {
  const parsed = connectWhatsAppSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  return parsed.data;
};

const parseEmbeddedSignupPayload = (req: Request) => {
  const parsed = embeddedSignupSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  return parsed.data;
};

const generateVerifyToken = () => crypto.randomBytes(24).toString("hex");

const enableWhatsAppChannelForOrganization = async (organizationId: string) => {
  await Organization.findByIdAndUpdate(organizationId, {
    $addToSet: { allowedChannels: "whatsapp" },
  });
};

const connectWhatsApp = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const payload = parseConnectPayload(req);

  whatsappLog.info("CONNECTION", "Manual WhatsApp connect requested", {
    organizationId,
    phoneNumberId: payload.phoneNumberId,
    wabaId: payload.wabaId,
  });

  const connection = await upsertConnection({
    organizationId,
    wabaId: payload.wabaId,
    businessName: payload.businessName,
    phoneNumberId: payload.phoneNumberId,
    displayPhoneNumber: payload.displayPhoneNumber,
    accessToken: payload.accessToken,
    verifyToken: payload.verifyToken,
  });

  await enableWhatsAppChannelForOrganization(organizationId);

  let webhookSetup: any = null;
  try {
    webhookSetup = await ensureInboundWebhooks(organizationId, {
      verifyToken: payload.verifyToken,
    });
  } catch (error) {
    whatsappLog.warn("CONNECTION", "Inbound webhook setup failed after manual connect", {
      organizationId,
      error: getErrorMessage(error),
    });
    await markWebhookSubscription({
      organizationId,
      phoneNumberId: payload.phoneNumberId,
      status: "failed",
      error: getErrorMessage(error),
    });
  }

  whatsappLog.info("CONNECTION", "WhatsApp connection saved", {
    organizationId,
    phoneNumberId: connection.phoneNumberId,
    wabaId: connection.wabaId,
    status: connection.status,
    inboundWebhooksReady: webhookSetup?.allSucceeded ?? false,
  });

  apiResponse(res, 200, "WhatsApp connection saved", {
    connection: toConnectionResponse(connection),
    webhookSetup,
  });
});

const getWhatsAppStatus = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const connections = await listConnectionsByOrganizationId(organizationId);

  whatsappLog.debug("CONNECTION", "WhatsApp status requested", {
    organizationId,
    connectionCount: connections.length,
  });

  const recentWebhookLogs = await WebhookLog.find({ organizationId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("status externalId eventType errorMessage createdAt phoneNumberId")
    .lean();

  const processedCount = await WebhookLog.countDocuments({
    organizationId,
    status: "processed",
  });
  const failedCount = await WebhookLog.countDocuments({
    organizationId,
    status: "failed",
  });

  const callbackUrl = buildCallbackUrl();
  const metaWebhook = await fetchMetaWebhookDiagnostics();

  apiResponse(res, 200, "WhatsApp connection status", {
    connections: connections.map(toConnectionResponse),
    webhook: {
      callbackUrl,
      callbackIsPublic: isPublicCallbackUrl(callbackUrl),
      messagesFieldSubscribed: metaWebhook.messagesSubscribed,
      metaCallbackUrl: metaWebhook.callbackUrl,
      subscribedFields: metaWebhook.fields,
      recentLogs: recentWebhookLogs,
      processedCount,
      failedCount,
      metaError: (metaWebhook as any).error ?? null,
    },
  });
});

const diagnoseInboundWebhooks = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const callbackUrl = buildCallbackUrl();
  const metaWebhook = await fetchMetaWebhookDiagnostics();
  const metaCallbackUrl = metaWebhook.callbackUrl ?? null;
  const urlsMatch = Boolean(metaCallbackUrl && metaCallbackUrl === callbackUrl);

  apiResponse(res, 200, "WhatsApp webhook diagnostics", {
    organizationId,
    publicApiUrl: env.publicApiUrl,
    callbackUrl,
    callbackIsPublic: isPublicCallbackUrl(callbackUrl),
    configuredCallbackReachable: await probeUrl(callbackUrl),
    metaCallbackUrl,
    metaCallbackReachable: metaCallbackUrl ? await probeUrl(metaCallbackUrl) : false,
    urlsMatch,
    messagesFieldSubscribed: metaWebhook.messagesSubscribed,
    subscribedFields: metaWebhook.fields,
    metaError: (metaWebhook as any).error ?? null,
    fixSteps: [
      "Run: ngrok http 5000 (or use your production API URL)",
      "Set PUBLIC_API_URL=https://YOUR-PUBLIC-URL in backend/.env",
      "Restart backend, then click Enable inbound messages in WhatsApp settings",
      "Send a WhatsApp message — you should see [Webhook] POST in backend logs",
    ],
  });
});

const setupInboundWebhooks = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);

  whatsappLog.info("WEBHOOK_SETUP", "Manual inbound webhook setup requested", {
    organizationId,
  });

  const result = await ensureInboundWebhooks(organizationId);

  apiResponse(res, 200, "Inbound WhatsApp webhooks configured", result);
});

const disconnectWhatsApp = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const phoneNumberId = String(req.params.phoneNumberId ?? "");

  if (!phoneNumberId.trim()) {
    throw new AppError("Phone number ID is required", 400);
  }

  const connection = await disconnectConnection(organizationId, phoneNumberId);

  if (!connection) {
    throw new AppError("WhatsApp connection not found", 404);
  }

  apiResponse(res, 200, "WhatsApp connection disconnected", {
    connection: toConnectionResponse(connection),
  });
});

const completeEmbeddedSignup = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const payload = parseEmbeddedSignupPayload(req);

  whatsappLog.info("CONNECTION", "Embedded signup started", {
    organizationId,
    redirectUri: payload.redirectUri,
  });

  const shortToken = await exchangeCodeForToken({
    code: payload.code,
    redirectUri: payload.redirectUri,
  });

  let longToken: any = null;
  try {
    longToken = await exchangeForLongLivedToken({
      shortLivedToken: shortToken.access_token,
    });
  } catch (error) {
    longToken = null;
  }

  const accessToken = longToken?.access_token || shortToken.access_token;
  const expiresIn = longToken?.expires_in ?? shortToken?.expires_in ?? null;
  const accessTokenExpiresAt =
    typeof expiresIn === "number" ? new Date(Date.now() + expiresIn * 1000) : null;

  const wabaResult = await fetchOwnedWabaAccounts(accessToken);
  const wabaAccounts = Array.isArray(wabaResult?.data) ? wabaResult.data : [];

  if (wabaAccounts.length === 0) {
    throw new AppError("No WhatsApp Business Accounts found for this user", 400);
  }

  const connections: any[] = [];
  const verifyTokens: Array<{ phoneNumberId: string; verifyToken: string }> = [];
  const subscribedWabas = new Set<string>();

  for (const waba of wabaAccounts) {
    const phoneNumbers = Array.isArray(waba?.phone_numbers) ? waba.phone_numbers : [];

    for (const phoneNumber of phoneNumbers) {
      const phoneNumberId = String(phoneNumber?.id ?? "").trim();
      if (!phoneNumberId) {
        continue;
      }

      const verifyToken = generateVerifyToken();
      const connection = await upsertConnection({
        organizationId,
        wabaId: String(waba?.id ?? ""),
        businessName: String(waba?.name ?? ""),
        phoneNumberId,
        displayPhoneNumber: String(phoneNumber?.display_phone_number ?? ""),
        accessToken,
        accessTokenExpiresAt,
        verifyToken,
        webhookSubscriptionStatus: "pending",
      });

      const wabaId = String(waba?.id ?? "");

      if (wabaId && !subscribedWabas.has(wabaId)) {
        try {
          await ensureAppSubscribedToWaba({ wabaId, accessToken });
          subscribedWabas.add(wabaId);
        } catch (error) {
          await markWebhookSubscription({
            organizationId,
            phoneNumberId,
            status: "failed",
            error: getErrorMessage(error),
          });
        }
      }

      if (subscribedWabas.has(wabaId)) {
        await markWebhookSubscription({
          organizationId,
          phoneNumberId,
          status: "subscribed",
        });
      }

      connections.push(toConnectionResponse(connection));
      verifyTokens.push({ phoneNumberId, verifyToken });
    }
  }

  if (connections.length === 0) {
    throw new AppError("No WhatsApp phone numbers found in this account", 400);
  }

  await enableWhatsAppChannelForOrganization(organizationId);

  let webhookSetup: any = null;
  const primaryVerifyToken = verifyTokens[0]?.verifyToken;
  if (primaryVerifyToken) {
    try {
      webhookSetup = await ensureInboundWebhooks(organizationId, {
        verifyToken: primaryVerifyToken,
      });
    } catch (error) {
      whatsappLog.warn("CONNECTION", "Inbound webhook setup failed after embedded signup", {
        organizationId,
        error: getErrorMessage(error),
      });
    }
  }

  whatsappLog.info("CONNECTION", "Embedded signup completed", {
    organizationId,
    connectionCount: connections.length,
    phoneNumberIds: connections.map((c: any) => c.phoneNumberId),
    subscribedWabaCount: subscribedWabas.size,
    inboundWebhooksReady: webhookSetup?.allSucceeded ?? false,
  });

  apiResponse(res, 200, "WhatsApp Embedded Signup completed", {
    connections,
    verifyTokens,
    webhookSetup,
  });
});

export {
  connectWhatsApp,
  getWhatsAppStatus,
  disconnectWhatsApp,
  completeEmbeddedSignup,
  diagnoseInboundWebhooks,
  setupInboundWebhooks,
};

