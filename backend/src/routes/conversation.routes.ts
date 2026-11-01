import express from "express";

import { protect } from "../middlewares/auth.middleware";
import { validateApiKey } from "../middlewares/validateApiKey.middleware";
import { askCustomerConversation, previewConversation, listOrganizationConversations, listConversationMessages, takeoverConversation, returnConversationToAi, sendAgentMessage } from "../controllers/conversation.controller";

const router = express.Router();

router.post("/ask", validateApiKey, askCustomerConversation);
router.post("/preview", protect, previewConversation);
router.get("/", protect, listOrganizationConversations);
router.get("/:id/messages", protect, listConversationMessages);
router.post("/:id/messages", protect, sendAgentMessage);
router.put("/:id/takeover", protect, takeoverConversation);
router.post("/:id/takeover", protect, takeoverConversation);
router.put("/:id/return-to-ai", protect, returnConversationToAi);
router.post("/:id/return-to-ai", protect, returnConversationToAi);

export default router;

