const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const {
  connectWhatsApp,
  getWhatsAppStatus,
  disconnectWhatsApp,
  completeEmbeddedSignup,
  diagnoseInboundWebhooks,
  setupInboundWebhooks,
} = require("../controllers/whatsapp.controller");

const router = express.Router();

router.post("/connect", protect, connectWhatsApp);
router.post("/embedded-signup/complete", protect, completeEmbeddedSignup);
router.get("/status", protect, getWhatsAppStatus);
router.get("/webhook/diagnose", protect, diagnoseInboundWebhooks);
router.post("/webhook/setup", protect, setupInboundWebhooks);
router.delete("/disconnect/:phoneNumberId", protect, disconnectWhatsApp);

module.exports = router;

export {};
