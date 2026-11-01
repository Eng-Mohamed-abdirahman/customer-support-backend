import express from "express";

import { verifyWhatsAppWebhook, receiveWhatsAppWebhook } from "../controllers/webhook.controller";
import { webhookLimiter } from "../middlewares/rateLimit.middleware";
import { verifyWhatsAppSignature } from "../middlewares/whatsappSignature.middleware";

const router = express.Router();

router.get("/whatsapp", verifyWhatsAppWebhook);
router.post("/whatsapp", webhookLimiter, verifyWhatsAppSignature, receiveWhatsAppWebhook);

export default router;

