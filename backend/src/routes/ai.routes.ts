const express = require("express");

const { validateApiKey } = require("../middlewares/validateApiKey.middleware");
const { aiLimiter } = require("../middlewares/rateLimit.middleware");
const { chatWithAi } = require("../controllers/ai.controller");

const router = express.Router();

router.post("/chat", aiLimiter, validateApiKey, chatWithAi);

module.exports = router;

export {};
