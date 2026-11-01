import { Request, Response } from "express";

import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/appError";
import { whatsappLog } from "../utils/whatsappLogger";
import { processWebhookPayload } from "../services/whatsappWebhook.service";
import { getConnectionByVerifyToken } from "../services/whatsapp.service";

const summarizeWebhookBody = (body: any) => {
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  const changes = entries.flatMap((entry: any) =>
    Array.isArray(entry?.changes) ? entry.changes : []
  );

  return {
    object: body?.object ?? null,
    entryCount: entries.length,
    changeCount: changes.length,
    phoneNumberIds: [
      ...new Set(
        changes
          .map((change: any) => String(change?.value?.metadata?.phone_number_id ?? "").trim())
          .filter(Boolean)
      ),
    ],
    messageCount: changes.reduce(
      (total: number, change: any) =>
        total + (Array.isArray(change?.value?.messages) ? change.value.messages.length : 0),
      0
    ),
    statusCount: changes.reduce(
      (total: number, change: any) =>
        total + (Array.isArray(change?.value?.statuses) ? change.value.statuses.length : 0),
      0
    ),
  };
};

const verifyWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) => {
  const mode = String(req.query["hub.mode"] ?? "");
  const token = String(req.query["hub.verify_token"] ?? "");
  const challenge = String(req.query["hub.challenge"] ?? "");

  whatsappLog.info("WEBHOOK_VERIFY", "Incoming verification request", {
    mode,
    hasToken: Boolean(token),
    hasChallenge: Boolean(challenge),
  });

  if (mode !== "subscribe" || !token) {
    whatsappLog.warn("WEBHOOK_VERIFY", "Invalid verification request", { mode, hasToken: Boolean(token) });
    throw new AppError("Invalid webhook verification request", 400);
  }

  const connection = await getConnectionByVerifyToken(token);

  if (!connection) {
    whatsappLog.warn("WEBHOOK_VERIFY", "Verify token not found — rejecting with 403", {
      verifyToken: token,
    });
    res.sendStatus(403);
    return;
  }

  connection.lastVerifiedAt = new Date();
  await connection.save();

  whatsappLog.info("WEBHOOK_VERIFY", "Webhook verified successfully", {
    organizationId: String(connection.organizationId),
    phoneNumberId: connection.phoneNumberId,
    wabaId: connection.wabaId,
  });

  res.status(200).send(challenge);
});

const receiveWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) => {
  const summary = summarizeWebhookBody(req.body);

  whatsappLog.info("WEBHOOK_RECEIVE", "Meta webhook payload received", summary);

  res.status(200).json({ status: "received" });

  setImmediate(() => {
    whatsappLog.debug("WEBHOOK_PROCESS", "Starting async webhook processing", summary);

    processWebhookPayload(req.body).catch((error: any) => {
      whatsappLog.error("WEBHOOK_PROCESS", "Webhook processing failed", {
        error: String(error?.message ?? error),
        stack: error?.stack,
        ...summary,
      });
    });
  });
});

export {
  verifyWhatsAppWebhook,
  receiveWhatsAppWebhook,
};

