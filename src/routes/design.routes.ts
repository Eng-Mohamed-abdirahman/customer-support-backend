const express = require("express");

const { validateApiKey } = require("../middlewares/validateApiKey.middleware");
const {
  optimizePrompt,
  generateDesign,
  regenerateDesign,
  listDesignHistory,
  getDesignById,
  replicateWebhook,
} = require("../controllers/design.controller");
const {
  validateOptimize,
  validateGenerate,
  validateListHistory,
} = require("../middlewares/design.validator");

const router = express.Router();

router.post("/optimize-prompt", validateApiKey, validateOptimize, optimizePrompt);
router.post("/generate", validateApiKey, validateGenerate, generateDesign);
router.get("/", validateApiKey, validateListHistory, listDesignHistory);
router.get("/:designId", validateApiKey, getDesignById);
router.post("/regenerate", validateApiKey, regenerateDesign);
// Endpoint for Replicate webhooks (no API key expected; secure with secret if desired)
router.post("/webhook/replicate", express.json({ limit: "1mb" }), replicateWebhook);

module.exports = router;

export {};
