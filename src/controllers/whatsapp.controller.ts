import { Request, Response } from "express";
import crypto from "crypto";

const mongoose = require("mongoose");
const { env } = require("../config/env");

const { apiResponse } = require("../utils/apiResponse");
const { AppError } = require("../utils/appError");
const { asyncHandler } = require("../utils/asyncHandler");
const { connectWhatsAppSchema, embeddedSignupSchema } = require("../validators/whatsapp.validator");
const {
  upsertConnection,
  listConnectionsByOrganizationId,
  disconnectConnection,
  toConnectionResponse,
  markWebhookSubscription,
} = require("../services/whatsapp.service");
const {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchOwnedWabaAccounts,
  subscribeAppToWaba,
} = require("../services/whatsappGraph.service");

type AuthenticatedUser = {
  _id: string;
  company?: string | null;
  organizationId?: string | null;
};

const resolveOrganizationId = (req: Request): string => {
  const user = (req as any).user as AuthenticatedUser | undefined;
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

const connectWhatsApp = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const payload = parseConnectPayload(req);

  const connection = await upsertConnection({
    organizationId,
    wabaId: payload.wabaId,
    businessName: payload.businessName,
    phoneNumberId: payload.phoneNumberId,
    displayPhoneNumber: payload.displayPhoneNumber,
    accessToken: payload.accessToken,
    verifyToken: payload.verifyToken,
  });

  apiResponse(res, 200, "WhatsApp connection saved", {
    connection: toConnectionResponse(connection),
  });
});

const getWhatsAppStatus = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const connections = await listConnectionsByOrganizationId(organizationId);

  apiResponse(res, 200, "WhatsApp connection status", {
    connections: connections.map(toConnectionResponse),
  });
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

  if (env.WHATSAPP_OAUTH_REDIRECT_URI && payload.redirectUri !== env.WHATSAPP_OAUTH_REDIRECT_URI) {
    throw new AppError("Invalid redirect URI", 400);
  }

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
          await subscribeAppToWaba({ wabaId, accessToken });
          subscribedWabas.add(wabaId);
        } catch (error: any) {
          await markWebhookSubscription({
            organizationId,
            phoneNumberId,
            status: "failed",
            error: String(error?.message ?? error),
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

  apiResponse(res, 200, "WhatsApp Embedded Signup completed", {
    connections,
    verifyTokens,
  });
});

module.exports = {
  connectWhatsApp,
  getWhatsAppStatus,
  disconnectWhatsApp,
  completeEmbeddedSignup,
};

export {};
