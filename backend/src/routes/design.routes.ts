import express from "express";

import { validateApiKey } from "../middlewares/validateApiKey.middleware";
import { optimizePrompt, generateDesign, regenerateDesign, listDesignHistory, getDesignById, replicateWebhook } from "../controllers/design.controller";
import { validateOptimize, validateGenerate, validateListHistory } from "../middlewares/design.validator";

const router = express.Router();

router.post("/optimize-prompt", validateApiKey, validateOptimize, optimizePrompt);
router.post("/generate", validateApiKey, validateGenerate, generateDesign);
router.get("/", validateApiKey, validateListHistory, listDesignHistory);
router.get("/:designId", validateApiKey, getDesignById);
router.post("/regenerate", validateApiKey, regenerateDesign);
// Endpoint for Replicate webhooks (no API key expected; secure with secret if desired)
router.post("/webhook/replicate", express.json({ limit: "1mb" }), replicateWebhook);

export default router;

