const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const { validateApiKey } = require("../middlewares/validateApiKey.middleware");
const {
  askCustomerConversation,
  previewConversation,
  listOrganizationConversations,
  listConversationMessages,
} = require("../controllers/conversation.controller");

const router = express.Router();

router.post("/ask", validateApiKey, askCustomerConversation);
router.post("/preview", protect, previewConversation);
router.get("/", protect, listOrganizationConversations);
router.get("/:id/messages", protect, listConversationMessages);

module.exports = router;

export {};