import express from "express";

import { validateApiKey } from "../middlewares/validateApiKey.middleware";
import { aiLimiter } from "../middlewares/rateLimit.middleware";
import { chatWithAi } from "../controllers/ai.controller";

const router = express.Router();

router.post("/chat", aiLimiter, validateApiKey, chatWithAi);

export default router;

