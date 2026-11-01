import express from "express";
import { inngestWebhookHandler } from "../controllers/inngest.controller";

const router = express.Router();

router.post("/webhook", express.json({ limit: "1mb" }), inngestWebhookHandler);

export default router;

