const express = require("express");

const { validateApiKey } = require("../middlewares/validateApiKey.middleware");
const { chatWithAi } = require("../controllers/ai.controller");

const router = express.Router();

router.post("/chat", validateApiKey, chatWithAi);

module.exports = router;

export {};
