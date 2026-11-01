const express = require("express");
const { inngestWebhookHandler } = require("../controllers/inngest.controller");

const router = express.Router();

router.post("/webhook", express.json({ limit: "1mb" }), inngestWebhookHandler);

module.exports = router;

export {};
