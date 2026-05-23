const express = require("express");

const {
  verifyWhatsAppWebhook,
  receiveWhatsAppWebhook,
} = require("../controllers/webhook.controller");
const { webhookLimiter } = require("../middlewares/rateLimit.middleware");
const { verifyWhatsAppSignature } = require("../middlewares/whatsappSignature.middleware");

const router = express.Router();

router.get("/whatsapp", verifyWhatsAppWebhook);
router.post("/whatsapp", webhookLimiter, verifyWhatsAppSignature, receiveWhatsAppWebhook);

module.exports = router;

export {};
