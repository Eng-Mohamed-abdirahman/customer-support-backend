const express = require("express");

const {
  verifyWhatsAppWebhook,
  receiveWhatsAppWebhook,
} = require("../controllers/webhook.controller");

const router = express.Router();

router.get("/whatsapp", verifyWhatsAppWebhook);
router.post("/whatsapp", receiveWhatsAppWebhook);

module.exports = router;

export {};
