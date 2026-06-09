import { NextFunction, Request, Response } from "express";
import crypto from "crypto";

import { env } from "../config/env";
import { AppError } from "../utils/appError";
import { whatsappLog } from "../utils/whatsappLogger";

const resolveSignature = (req: Request) => {
  const signatureHeader = req.headers["x-hub-signature-256"];
  if (typeof signatureHeader === "string" && signatureHeader.trim()) {
    return signatureHeader.trim();
  }

  return null;
};

export const verifyWhatsAppSignature = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!env.WHATSAPP_VERIFY_SIGNATURE) {
    next();
    return;
  }

  if (!env.WHATSAPP_APP_SECRET) {
    if (env.NODE_ENV !== "production") {
      console.warn("WhatsApp webhook signature verification skipped: WHATSAPP_APP_SECRET is not set");
      next();
      return;
    }

    next(new AppError("WhatsApp webhook signature verification is not configured", 500));
    return;
  }

  const signature = resolveSignature(req);
  if (!signature) {
    whatsappLog.warn("WEBHOOK_RECEIVE", "Rejected webhook — missing x-hub-signature-256 header");
    next(new AppError("Missing WhatsApp webhook signature", 401));
    return;
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    next(new AppError("Webhook payload signature cannot be verified", 400));
    return;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", env.WHATSAPP_APP_SECRET)
    .update(rawBody)
    .digest("hex")}`;

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    whatsappLog.error("WEBHOOK_RECEIVE", "Rejected webhook — invalid signature", {
      hint: "Check WHATSAPP_APP_SECRET matches your Meta app",
    });
    next(new AppError("Invalid WhatsApp webhook signature", 401));
    return;
  }

  next();
};
