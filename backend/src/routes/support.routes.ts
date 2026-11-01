import express, { Request, Response } from "express";
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Ticket = require("../models/Ticket");
const { apiResponse } = require("../utils/apiResponse");
const { AppError } = require("../utils/appError");
const { asyncHandler } = require("../utils/asyncHandler");
const { appendMessage, getOrCreateConversation } = require("../services/conversationStore.service");
const { emitToOrganization, emitToConversation } = require("../services/socket.service");

const router = express.Router();

/**
 * Endpoint triggered when AI determines Handoff/Escalation is required
 */
router.post(
  "/escalate",
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId, conversationId, userId, customerPhone, customerName, lastUserMessage, organizationId: bodyOrgId } = req.body;
    const targetId = conversationId || sessionId;

    const organizationId = bodyOrgId || (req as any).organizationId || (req as any).user?.organizationId || (req as any).user?.company;

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
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId, conversationId, agentId: bodyAgentId } = req.body;
    const targetId = conversationId || sessionId;
    const agentId = bodyAgentId || (req as any).user?._id;

    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      throw new AppError("Valid Conversation ID is required", 400);
    }

    if (!agentId) {
      throw new AppError("Agent ID is required to accept chat", 400);
    }

    // Atomic find and update to prevent race conditions
    const conversation = await Conversation.findOneAndUpdate(
      { _id: targetId, status: "pending" },
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
