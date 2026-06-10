const express = require("express");

const { validateApiKey } = require("../middlewares/validateApiKey.middleware");
const {
  optimizePrompt,
  generateDesign,
  regenerateDesign,
  replicateWebhook,
} = require("../controllers/design.controller");
const { validateOptimize, validateGenerate } = require("../middlewares/design.validator");

const router = express.Router();

router.post("/optimize-prompt", validateApiKey, validateOptimize, optimizePrompt);
router.post("/generate", validateApiKey, validateGenerate, generateDesign);
router.post("/regenerate", validateApiKey, regenerateDesign);
// Endpoint for Replicate webhooks (no API key expected; secure with secret if desired)
router.post("/webhook/replicate", express.json({ limit: "1mb" }), replicateWebhook);

module.exports = router;

export {};
