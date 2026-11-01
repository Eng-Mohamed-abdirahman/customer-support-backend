import express, { Request, Response } from "express";
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Ticket = require("../models/Ticket");
const { apiResponse } = require("../utils/apiResponse");
const { AppError } = require("../utils/appError");
const { asyncHandler } = require("../utils/asyncHandler");
const { appendMessage, getOrCreateConversation } = require("../services/conversationStore.service");
const { emitToOrganization, emitToConversation } = require("../services/socket.service");
const { protect } = require("../middlewares/auth.middleware");
const { validateApiKey } = require("../middlewares/validateApiKey.middleware");
const { aiLimiter } = require("../middlewares/rateLimit.middleware");

const router = express.Router();

/**
 * Endpoint triggered when AI determines Handoff/Escalation is required
 */
router.post(
  "/escalate",
  aiLimiter,
  validateApiKey,
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId, conversationId, userId, customerPhone, customerName, lastUserMessage } = req.body;
    const targetId = conversationId || sessionId;

    // The organization always comes from the API key, never from the request body.
    const organizationId = req.organizationId;

    if (!organizationId) {
      throw new AppError("Organization ID is required for escalation", 400);
    }

    let conversation;
    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
      conversation = await Conversation.findOne({ _id: targetId, organizationId });
    }

    if (!conversation && (customerPhone || userId)) {
      conversation = await getOrCreateConversation({
        organizationId,
        channel: "website",
        customerPhone: customerPhone || userId,
        customerName: customerName || "",
      });
    }

    if (!conversation) {
      throw new AppError("Conversation or customer identification required", 400);
    }

    conversation.status = "pending";
    conversation.responderType = "agent";
    conversation.aiEnabled = false;
    conversation.assignedAgent = null;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const reasonText = lastUserMessage || "Customer requested human support";

    await appendMessage({
      organizationId,
      conversationId: String(conversation._id),
      senderType: "system",
      messageType: "text",
      contentText: "System: Human handoff requested. Conversation escalated to agent queue.",
      aiGenerated: false,
    });

    try {
      const newTicket = await Ticket.create({
        organizationId,
        conversationId: String(conversation._id),
        title: `Human Handoff: ${reasonText.slice(0, 50)}`,
        description: reasonText,
        customerName: conversation.customerName || conversation.customerPhone || "Website Customer",
        customerPhone: conversation.customerPhone || "",
        status: "open",
      });
      emitToOrganization(organizationId, "ticket:created", newTicket);
    } catch (err) {
      console.error("Ticket creation on escalation failed:", err);
    }

    const handoffPayload = {
      sessionId: String(conversation._id),
      conversationId: String(conversation._id),
      userId: conversation.customerPhone,
      customerName: conversation.customerName,
      customerPhone: conversation.customerPhone,
      reason: reasonText,
      timestamp: conversation.updatedAt,
    };

    emitToOrganization(organizationId, "incoming_handoff_alert", handoffPayload);
    emitToOrganization(organizationId, "conversation:updated", {
      conversationId: String(conversation._id),
      status: "pending",
      responderType: "agent",
      aiEnabled: false,
      assignedAgent: null,
      lastMessageAt: conversation.lastMessageAt,
    });

    return apiResponse(res, 200, "Escalation successfully broadcasted to agents.", handoffPayload);
  })
);

/**
 * Endpoint triggered when an agent clicks "Accept" on the dashboard
 */
router.post(
  "/accept-chat",
  protect,
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId, conversationId } = req.body;
    const targetId = conversationId || sessionId;
    // The agent is always the signed-in user, scoped to their own organization.
    const agentId = req.user?._id;
    const organizationId = req.user?.organizationId;

    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      throw new AppError("Valid Conversation ID is required", 400);
    }

    if (!agentId || !organizationId) {
      throw new AppError("Only organization members can accept chats", 403);
    }

    // Atomic find and update to prevent race conditions
    const conversation = await Conversation.findOneAndUpdate(
      { _id: targetId, organizationId, status: "pending" },
      {
        status: "open",
        responderType: "agent",
        aiEnabled: false,
        assignedAgent: agentId,
      },
      { new: true }
    );

    if (!conversation) {
      return res.status(409).json({
        success: false,
        message: "This session has already been claimed by another agent or is no longer pending.",
      });
    }

    const orgId = String(conversation.organizationId);

    await appendMessage({
      organizationId: orgId,
      conversationId: String(conversation._id),
      senderType: "system",
      messageType: "text",
      contentText: "Support agent joined the conversation.",
      aiGenerated: false,
    });

    emitToOrganization(orgId, "session_claimed", {
      sessionId: String(conversation._id),
      conversationId: String(conversation._id),
      agentId,
    });

    emitToOrganization(orgId, "conversation:updated", {
      conversationId: String(conversation._id),
      status: "open",
      responderType: "agent",
      aiEnabled: false,
      assignedAgent: agentId,
    });

    emitToConversation(String(conversation._id), `chat_assigned_${conversation._id}`, { agentId });

    return apiResponse(res, 200, "Chat successfully accepted", { conversation });
  })
);

module.exports = router;
export {};
