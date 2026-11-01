import Order from "../../models/Order";
import Ticket from "../../models/Ticket";
import Conversation from "../../models/Conversation";

import { getErrorMessage } from "../../utils/errors";
import { createLogger } from "../../utils/logger";
import { emitToOrganization } from "../socket.service";
import type { ConversationCustomer, ConversationOrganization } from "./types";

const log = createLogger("RAG");

export type ToolChatMessage = { role: string; content: string };

/** Build the tool definitions exposed to the LLM for this organization. */
export const buildConversationTools = (organization: ConversationOrganization): any[] => {
  const tools: any[] = [
    {
      type: "function",
      function: {
        name: "trigger_human_handoff",
        description: "Trigger live human agent handoff when the customer asks for a human, expresses escalation/frustration, or has a complex out-of-scope issue.",
        parameters: {
          type: "object",
          properties: {
            reason: { type: "string", description: "Concise professional explanation of why the customer is being transferred to a live human agent." },
          },
          required: ["reason"],
        },
      },
    },
  ];
  const enabledFeatures = Array.isArray(organization.enabledFeatures) ? organization.enabledFeatures : [];
  if (enabledFeatures.includes("orders")) {
    tools.push({
      type: "function",
      function: {
        name: "create_order",
        description: "Create an order for the customer after collecting all required information.",
        parameters: {
          type: "object",
          properties: {
            customerName: { type: "string", description: "The name of the customer." },
            phone: { type: "string", description: "The customer's phone number." },
            orderName: { type: "string", description: "The name/details of the item(s) being ordered." },
            quantity: { type: "number", description: "Quantity of items ordered (default 1)." },
            notes: { type: "string", description: "Any special instructions or notes." },
            deliveryAddress: { type: "string", description: "The delivery address if applicable." },
          },
          required: ["customerName", "phone", "orderName"],
        },
      },
    });
  }

  return tools;
};

/**
 * Execute the tool calls requested by the LLM (order creation, human handoff + ticket),
 * appending the assistant/tool messages to `messages` for the follow-up completion.
 */
export const executeToolCalls = async (
  toolCalls: any[],
  input: {
    organization: ConversationOrganization;
    customer?: ConversationCustomer;
  },
  messages: ToolChatMessage[]
): Promise<void> => {
  for (const toolCall of toolCalls) {
    if (toolCall.function.name === "create_order") {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        await Order.create({
          organizationId: input.organization._id,
          customerName: args.customerName,
          phone: args.phone,
          orderName: args.orderName,
          quantity: args.quantity || 1,
          notes: args.notes || "",
          deliveryAddress: args.deliveryAddress || "",
          status: "pending",
        });
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [toolCall],
        } as any);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ success: true, message: "Order created successfully." }),
        } as any);
      } catch (e) {
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [toolCall],
        } as any);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ success: false, message: getErrorMessage(e) }),
        } as any);
      }
    }
    if (toolCall.function.name === "trigger_human_handoff") {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        const reasonText = args.reason || "Customer requested live support";
        const customerPhone = input.customer?.id || "";

        let activeConv: any = null;
        if (customerPhone && input.organization._id) {
          activeConv = await Conversation.findOneAndUpdate(
            { organizationId: input.organization._id, customerPhone },
            {
              status: "pending",
              responderType: "agent",
              aiEnabled: false,
              assignedAgent: null,
              lastMessageAt: new Date(),
            },
            { new: true }
          );
        }

        if (activeConv && input.organization._id) {
          emitToOrganization(String(input.organization._id), "incoming_handoff_alert", {
            sessionId: String(activeConv._id),
            conversationId: String(activeConv._id),
            userId: activeConv.customerPhone,
            customerName: activeConv.customerName,
            customerPhone: activeConv.customerPhone,
            reason: reasonText,
            timestamp: activeConv.updatedAt,
          });

          emitToOrganization(String(input.organization._id), "conversation:updated", {
            conversationId: String(activeConv._id),
            status: "pending",
            responderType: "agent",
            aiEnabled: false,
            assignedAgent: null,
            lastMessageAt: activeConv.lastMessageAt,
          });
        }

        try {
          const createdTicket = await Ticket.create({
            organizationId: input.organization._id,
            conversationId: activeConv ? String(activeConv._id) : undefined,
            title: `Human Handoff: ${reasonText.slice(0, 50)}`,
            description: reasonText,
            customerName: input.customer?.name || activeConv?.customerName || "Customer",
            customerPhone: input.customer?.id || activeConv?.customerPhone || "",
            status: "open",
          });
          emitToOrganization(String(input.organization._id), "ticket:created", createdTicket);
        } catch (e) {
          log.error("Failed to create ticket for tool handoff", e);
        }

        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [toolCall],
        } as any);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ success: true, message: "Human handoff triggered successfully. Live support agent notified on staff dashboard." }),
        } as any);
      } catch (e) {
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [toolCall],
        } as any);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ success: false, message: getErrorMessage(e) }),
        } as any);
      }
    }
  }
};
