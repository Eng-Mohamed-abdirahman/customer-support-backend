import { Request, Response } from "express";

const { asyncHandler } = require("../utils/asyncHandler");
const { AppError } = require("../utils/appError");
const { processWebhookPayload } = require("../services/whatsappWebhook.service");
const { getConnectionByVerifyToken } = require("../services/whatsapp.service");

const verifyWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) => {
  const mode = String(req.query["hub.mode"] ?? "");
  const token = String(req.query["hub.verify_token"] ?? "");
  const challenge = String(req.query["hub.challenge"] ?? "");

  if (mode !== "subscribe" || !token) {
    throw new AppError("Invalid webhook verification request", 400);
  }

  const connection = await getConnectionByVerifyToken(token);

  if (!connection) {
    res.sendStatus(403);
    return;
  }

  connection.lastVerifiedAt = new Date();
  await connection.save();

  res.status(200).send(challenge);
});

const receiveWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) => {
  try {
    await processWebhookPayload(req.body);
  } catch (error: any) {
    console.error(`WhatsApp webhook processing failed: ${error?.message ?? error}`);
  }

  res.status(200).json({ status: "received" });
});

module.exports = {
  verifyWhatsAppWebhook,
  receiveWhatsAppWebhook,
};

export {};
