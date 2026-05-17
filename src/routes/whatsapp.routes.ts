const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const {
  connectWhatsApp,
  getWhatsAppStatus,
  disconnectWhatsApp,
} = require("../controllers/whatsapp.controller");

const router = express.Router();

router.post("/connect", protect, connectWhatsApp);
router.get("/status", protect, getWhatsAppStatus);
router.delete("/disconnect", protect, disconnectWhatsApp);

module.exports = router;

export {};
