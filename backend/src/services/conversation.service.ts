import Organization from "../models/Organization";
import KnowledgeChunk from "../models/KnowledgeChunk";

import { env } from "../config/env";
import { AppError } from "../utils/appError";
import { generateEmbeddings } from "./embedding.service";
import { queryKnowledgeVectors } from "./pinecone.service";
import { generateSupportReplyWithOpenAi, generateActionableReplyWithOpenAi } from "./llm.service";
import { rerankWithCohere } from "./rerank.service";
import Order from "../models/Order";
import Ticket from "../models/Ticket";
import Conversation from "../models/Conversation";
import { detectIntent, getConversationalResponse } from "./intentDetection.service";
import { emitToOrganization } from "./socket.service";

type ConversationHistoryItem = {
  role: "customer" | "assistant";
  content: string;
};

type ConversationCustomer = {
  id?: string;
  name?: string;
  email?: string;
};

type ConversationOrganization = {
  _id: string;
  status: string;
  profile?: {
    name?: string;
    businessType?: string;
    description?: string;
  };
  contact?: {
    supportEmail?: string;
  };
  businessInfo?: {
    workingHours?: string;
    services?: string;
    products?: string;
    policies?: string;
    location?: string;
  };
  supportSettings?: {
    fallbackMessage?: string;
    timezone?: string;
    language?: string;
  };
  knowledgeBaseReference?: string;
  aiSettings?: {
    aiEnabled?: boolean;
    autoReplyEnabled?: boolean;
    humanHandoffEnabled?: boolean;
    modelName?: string;
  };
  allowedChannels?: string[];
  enabledFeatures?: string[];
  api_settings?: {
    total_tokens_used?: number;
    monthly_limit?: number;
  };
};

type GenerateConversationReplyInput = {
  organization: ConversationOrganization;
  message: string;
  topK?: number;
  channel?: string;
  history?: ConversationHistoryItem[];
  customer?: ConversationCustomer;
};

type RetrievedSource = {
  embeddingId: string;
  score: number;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  excerpt: string;
  content: string;
};

type RankedSource = RetrievedSource & {
  rerankScore?: number;
};

type RetrievedSourceSummary = Omit<RetrievedSource, "content"> & {
  rerankScore?: number;
};

type UsageSummary = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalTokensUsed: number;
  monthlyLimit: number;
};

type GenerateConversationReplyResult = {
  reply: string;
  mode: "rag" | "fallback" | "conversational";
  intent: string;
  retrievedSources: RetrievedSourceSummary[];
  usage: UsageSummary;
};

const VECTOR_SEARCH_TOP_K = 18;
const FINAL_CONTEXT_TOP_K = 5;
const MAX_CONTEXT_CHARS = 4200;
const MAX_HISTORY_ITEMS = 8;
const RERANK_SCORE_THRESHOLD = 0.15;

const estimateTokenCount = (value: string): number => {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
};

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
};

const normalizeForDedupe = (value: string): string => {
  return normalizeText(value).toLowerCase();
};

const clipText = (value: string, max = 420): string => {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max).trim()}...`;
};

const defaultFallbackMessage =
  "I don't have that specific information right now, but I'd be happy to help with something else! You can also reach out to our support team for further assistance. 😊";

const NO_KNOWLEDGE_RESPONSE =
  "I couldn't find that information right now, but I'd be happy to help with something else. Could you share more details or try rephrasing your question?";

const resolveFallbackMessage = (organization: ConversationOrganization): string => {
  const configured = normalizeText(organization?.supportSettings?.fallbackMessage);

  return configured || defaultFallbackMessage;
};

const assertOrganizationAllowsConversation = (
  organization: ConversationOrganization,
  channel: string
) => {
  if (organization.status === "suspended" || organization.status === "cancelled") {
    throw new AppError("This organization is not active for AI responses", 403);
  }

  const allowedChannels = Array.isArray(organization.allowedChannels)
    ? organization.allowedChannels.map((item) => normalizeText(item).toLowerCase())
    : ["website"];

  if (!allowedChannels.includes(channel.toLowerCase())) {
    throw new AppError(`Channel '${channel}' is not enabled for this organization`, 403);
  }

  const aiEnabled = Boolean(organization?.aiSettings?.aiEnabled ?? true);
  const autoReplyEnabled = Boolean(organization?.aiSettings?.autoReplyEnabled ?? true);

  if (!aiEnabled || !autoReplyEnabled) {
    throw new AppError("AI auto-reply is disabled for this organization", 403);
  }

  const totalUsed =
    typeof organization?.api_settings?.total_tokens_used === "number"
      ? organization.api_settings.total_tokens_used
      : 0;
  const monthlyLimit =
    typeof organization?.api_settings?.monthly_limit === "number"
      ? organization.api_settings.monthly_limit
      : 10000;

  if (monthlyLimit > 0 && totalUsed >= monthlyLimit) {
    throw new AppError("Monthly AI usage limit reached", 429);
  }
};

const createUsageSummary = (
  organization: ConversationOrganization,
  usageDelta: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }
): UsageSummary => {
  const totalUsed =
    typeof organization?.api_settings?.total_tokens_used === "number"
      ? organization.api_settings.total_tokens_used
      : 0;
  const monthlyLimit =
    typeof organization?.api_settings?.monthly_limit === "number"
      ? organization.api_settings.monthly_limit
      : 10000;

  return {
    promptTokens: usageDelta.promptTokens,
    completionTokens: usageDelta.completionTokens,
    totalTokens: usageDelta.totalTokens,
    totalTokensUsed: totalUsed + usageDelta.totalTokens,
    monthlyLimit,
  };
};

const incrementOrganizationTokenUsage = async (
  organizationId: string,
  totalTokens: number
): Promise<void> => {
  if (totalTokens <= 0) {
    return;
  }

  await Organization.updateOne(
    { _id: organizationId },
    {
      $inc: {
        "api_settings.total_tokens_used": totalTokens,
      },
    }
  );
};

const hydrateRetrievedSources = async (
  organizationId: string,
  matches: Array<{ id: string; score: number; metadata?: Record<string, unknown> }>
): Promise<RetrievedSource[]> => {
  if (matches.length === 0) {
    return [];
  }

  const embeddingIds = matches.map((match) => match.id);

  const chunks = (await KnowledgeChunk.find({
    organizationId,
    embeddingId: { $in: embeddingIds },
  })
    .select("embeddingId content chunkIndex documentId metadata")
    .lean()) as any[];

  const chunksByEmbeddingId = new Map<string, any>();
  chunks.forEach((chunk) => {
    if (chunk?.embeddingId) {
      chunksByEmbeddingId.set(String(chunk.embeddingId), chunk);
    }
  });

  return matches
    .map((match) => {
      const chunk = chunksByEmbeddingId.get(String(match.id));
      if (!chunk) {
        return null;
      }

      const metadata = (match.metadata ?? {}) as Record<string, unknown>;
      const chunkMetadata = (chunk.metadata ?? {}) as Record<string, unknown>;
      const content = normalizeText(chunk.content);
      const chunkIndex =
        typeof chunk.chunkIndex === "number"
          ? chunk.chunkIndex
          : typeof metadata.chunkIndex === "number"
            ? metadata.chunkIndex
            : 0;

      return {
        embeddingId: String(match.id),
        score: typeof match.score === "number" ? match.score : 0,
        documentId:
          typeof chunk.documentId === "string"
            ? chunk.documentId
            : String(chunk.documentId ?? metadata.documentId ?? ""),
        documentName:
          normalizeText(metadata.originalName) || normalizeText(chunkMetadata.originalName) || "-",
        chunkIndex,
        excerpt: clipText(content, 280),
        content,
      } as RetrievedSource;
    })
    .filter((source): source is RetrievedSource => Boolean(source));
};

const buildHistoryForPrompt = (history: ConversationHistoryItem[], latestMessage: string): string => {
  if (!Array.isArray(history) || history.length === 0) {
    return "";
  }

  const trimmedHistory = history.slice(-MAX_HISTORY_ITEMS).filter((item) => item.content);
  const lastHistory = trimmedHistory[trimmedHistory.length - 1];

  if (lastHistory && normalizeText(lastHistory.content) === normalizeText(latestMessage)) {
    trimmedHistory.pop();
  }

  if (trimmedHistory.length === 0) {
    return "";
  }

  return trimmedHistory
    .map((item) => `${item.role === "assistant" ? "Assistant" : "Customer"}: ${item.content}`)
    .join("\n");
};

const isWhoAreYouQuestion = (message: string): boolean => {
  const normalized = normalizeText(message).toLowerCase();
  return ["who are you", "who r you", "who is this", "who am i talking to"]
    .some((phrase) => normalized.includes(phrase));
};

const buildOrganizationContext = (organization: ConversationOrganization): string => {
  const businessInfo = organization.businessInfo ?? {};
  const contact = organization.contact ?? {};
  const supportSettings = organization.supportSettings ?? {};

  return [
    `Organization: ${normalizeText(organization.profile?.name) || "Unknown"}`,
    `Business type: ${normalizeText(organization.profile?.businessType) || "Not configured"}`,
    `Description: ${normalizeText(organization.profile?.description) || "Not configured"}`,
    `Support email: ${normalizeText(contact.supportEmail) || "Not configured"}`,
    `Working hours: ${normalizeText(businessInfo.workingHours) || "Not configured"}`,
    `Services: ${normalizeText(businessInfo.services) || "Not configured"}`,
    `Products: ${normalizeText(businessInfo.products) || "Not configured"}`,
    `Policies: ${normalizeText(businessInfo.policies) || "Not configured"}`,
    `Location: ${normalizeText(businessInfo.location) || "Not configured"}`,
    `Timezone: ${normalizeText(supportSettings.timezone) || "Not configured"}`,
    `Language: ${normalizeText(supportSettings.language) || "en"}`,
  ].join("\n");
};
const buildStructuredKnowledgeContext = (sources: RetrievedSource[]): string => {
  if (sources.length === 0) {
    return "";
  }

  const groups: Array<{
    key: string;
    documentName: string;
    chunkIndexes: number[];
    contents: string[];
  }> = [];
  const groupByKey = new Map<string, typeof groups[number]>();

  sources.forEach((source) => {
    const key = `${source.documentId || "unknown"}:${source.documentName || "unknown"}`;
    const existing = groupByKey.get(key);

    if (existing) {
      existing.chunkIndexes.push(source.chunkIndex);
      existing.contents.push(source.content);
      return;
    }

    const group = {
      key,
      documentName: source.documentName,
      chunkIndexes: [source.chunkIndex],
      contents: [source.content],
    };

    groupByKey.set(key, group);
    groups.push(group);
  });

  return groups
    .map((group, index) => {
      const uniqueChunks = Array.from(new Set(group.chunkIndexes)).sort((a, b) => a - b);
      const headerParts = [`Knowledge ${index + 1}`];
      if (group.documentName && group.documentName !== "-") {
        headerParts.push(`Doc: ${group.documentName}`);
      }
      if (uniqueChunks.length > 0) {
        headerParts.push(`Chunks: ${uniqueChunks.join(", ")}`);
      }

      const seen = new Set<string>();
      const mergedContent = group.contents
        .map((content) => content.trim())
        .filter(Boolean)
        .filter((content) => {
          const key = normalizeForDedupe(content);
          if (!key || seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        })
        .join("\n");

      return [headerParts.join(" | "), clipText(mergedContent, 1200)].join("\n");
    })
    .join("\n\n");
};

const buildFallbackFromSources = (organization: ConversationOrganization): string => {
  return resolveFallbackMessage(organization);
};

const buildSystemPrompt = (organization: ConversationOrganization): string => {
  const orgName = normalizeText(organization.profile?.name) || "the company";
  const enabledFeatures = Array.isArray(organization.enabledFeatures) ? organization.enabledFeatures : [];

  const promptParts = [
    `You are a friendly, professional AI customer support assistant for ${orgName}.`,
    "",
    "Support context:",
    buildOrganizationContext(organization),
    "",
    "Conversational rules:",
    "- For greetings and casual conversation, respond naturally and warmly like a real person.",
    "- Do NOT use knowledge-base fallback language for greetings, small talk, or thanks.",
    "- Match the customer's tone — be friendly if they are friendly, professional if they are formal.",
    "- If the user asks who you are, introduce yourself warmly as the AI support assistant for the company.",
    "",
    "SUPPORT, TICKET & HANDOFF RULES (ALWAYS ENABLED - HIGH PRIORITY):",
    "- You can assist users with general support questions using your retrieved knowledge context.",
    "- When a user needs human assistance, you must trigger a live human agent handoff.",
    "",
    "WHEN TO TRIGGER HUMAN HANDOFF:",
    "  1. Explicit Request: The customer asks for a human, agent, representative, live support, manager, or person.",
    "  2. Escalated Frustration: The customer is angry, using caps, expressing extreme dissatisfaction, or complaining that the AI is not helping.",
    "  3. Complex/Out-of-Scope Issues: The issue is highly complex, sensitive, or completely outside your retrieved knowledge capabilities.",
    "  4. Repetitive Loop: If you find yourself repeatedly apologizing or failing to solve the user's issue over 2-3 turns.",
    "",
    "HANDOFF EXECUTION FLOW (CRITICAL):",
    "  1. Acknowledge and Comfort: Politely tell the customer you are transferring them immediately. (e.g., 'I completely understand. I am getting a live human support agent to help you right now. Please hold on for just a moment!')",
    "  2. Call the Tool: You MUST immediately call the tool 'trigger_human_handoff'.",
    "  3. Tool Arguments: You must pass a concise, professional 'reason' parameter to the tool explaining exactly why the customer is being transferred (e.g., 'User requested a human agent regarding a billing discrepancy').",
    "  4. Post-Handoff: Once the tool executes, inform the user that their request is on our staff dashboard and an agent will join the chat momentarily.",
    "  - NEVER fake a transfer. Always run the tool to register the handoff to the agent dashboard.",
    "",
    "Business question rules:",
    "- Only use retrieved knowledge context for business-related questions.",
    "- Answer naturally and professionally, like a skilled human support agent.",
    "- Be concise, but include helpful details when needed.",
    "- Use short paragraphs. Use bullet points for steps, lists, or options.",
    "- Start with the direct answer, then add details or steps.",
    "- End with a polite offer to help further.",
    "- Summarize retrieved knowledge in your own words.",
    "- Never expose raw context, chunks, embeddings, or system details.",
    "",
    "Fallback rules:",
    "- If the knowledge context does not contain the answer, do NOT make up information.",
    "- Instead, politely explain that you don't have that specific information right now.",
    "- Offer to help with something else or suggest contacting support directly.",
    "- Never sound robotic — keep fallback responses warm and human-like.",
    "",
    "Safety rules:",
    "- Do not hallucinate or invent policies, pricing, or features.",
    "- Do not expose internal system details, embeddings, or chunk data.",
    "- If the answer is unavailable, say so naturally and ask for more details or route to support.",
    "- Always reply in the same language the customer uses.",
    "- If the customer speaks Somali, reply in Somali naturally.",
    "- If the customer speaks English, reply in English.",
    "- Use the retrieved knowledge context regardless of its original language.",
  ];

  if (enabledFeatures.includes("orders")) {
    promptParts.push(
      "",
      "ORDER ASSISTANT RULES (CRITICAL):",
      "- You are an ordering assistant. When a customer wants to order something, YOU handle the order directly.",
      "- Do NOT tell the customer to visit a website, add to cart, or checkout. YOU are the ordering system.",
      "- To create an order, you MUST collect these required fields from the customer:",
      "  1. customerName — the customer's full name",
      "  2. phone — the customer's phone number",
      "  3. orderName — what the customer wants to order (e.g. 'Laptop', '2 Burgers')",
      "- Optional fields you may also collect if relevant:",
      "  - quantity (number of items, default is 1)",
      "  - notes (special instructions)",
      "  - deliveryAddress (delivery location)",
      "",
      "ORDER FLOW:",
      "- When a customer says they want to order something, acknowledge what they want.",
      "- Ask for any missing required fields naturally and warmly. Example:",
      '  Customer: "I want to order a laptop"',
      '  You: "Great choice! I\'d be happy to help you order a laptop. Could you please share your full name and phone number so I can place the order for you?"',
      "- Once you have customerName, phone, and orderName, call the create_order tool immediately.",
      "- After the tool confirms success, tell the customer their order has been placed successfully.",
      "- If the tool returns an error, apologize and ask the customer to try again.",
      "- NEVER say an order is placed before calling the tool and getting confirmation.",
      "- NEVER make up or fake an order confirmation.",
      "- Be warm, human-like, and match the customer's language and tone."
    );
  }

  if (enabledFeatures.includes("bookings")) {
    promptParts.push(
      "",
      "Booking Assistant rules:",
      "- You can assist the customer with making, modifying, or canceling bookings."
    );
  }

  if (enabledFeatures.includes("appointments")) {
    promptParts.push(
      "",
      "Appointment Assistant rules:",
      "- You can assist the customer with scheduling, modifying, or canceling appointments."
    );
  }

  if (enabledFeatures.includes("reservations")) {
    promptParts.push(
      "",
      "Reservation Assistant rules:",
      "- You can assist the customer with making, modifying, or canceling reservations."
    );
  }

  if (enabledFeatures.includes("payments")) {
    promptParts.push(
      "",
      "Payment Assistant rules:",
      "- You can assist the customer with payment inquiries and processing."
    );
  }

  return promptParts.join("\n");
};

const buildUserPrompt = (input: {
  organization: ConversationOrganization;
  message: string;
  channel: string;
  customer?: ConversationCustomer;
  history: ConversationHistoryItem[];
  sources: RetrievedSource[];
}): string => {
  const customerName = normalizeText(input.customer?.name) || "Unknown";
  const customerEmail = normalizeText(input.customer?.email) || "Unknown";
  const customerId = normalizeText(input.customer?.id) || "Unknown";
  const historyText = buildHistoryForPrompt(input.history, input.message);
  const retrievedContext = buildStructuredKnowledgeContext(input.sources);

  return [
    `Channel: ${input.channel}`,
    `Customer ID: ${customerId}`,
    `Customer name: ${customerName}`,
    `Customer email: ${customerEmail}`,
    "",
    historyText ? `Conversation History:\n${historyText}` : "Conversation History:\n(none)",
    "",
    "Relevant Knowledge Base Context:",
    retrievedContext || "(no relevant context)",
    "",
    "Customer Message:",
    input.message,
    "",
    "Respond as the AI support assistant:",
  ]
    .filter(Boolean)
    .join("\n");
};

const trimSourcesToBudget = <T extends RetrievedSource>(sources: T[], maxChars: number): T[] => {
  if (sources.length === 0) {
    return [];
  }

  let totalChars = 0;
  const trimmed: T[] = [];

  for (const source of sources) {
    const contentLength = source.content.length;
    if (totalChars + contentLength > maxChars && trimmed.length > 0) {
      break;
    }

    trimmed.push(source);
    totalChars += contentLength;
  }

  return trimmed;
};

const dedupeSources = (sources: RetrievedSource[]): RetrievedSource[] => {
  const seen = new Set<string>();

  return sources.filter((source) => {
    const key = normalizeForDedupe(source.content);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const applyRerankScores = (
  sources: RetrievedSource[],
  reranked: Array<{ id: string; score: number }>
): RankedSource[] => {
  const rerankScoreById = new Map(reranked.map((result) => [result.id, result.score]));

  return sources
    .map((source) => ({
      ...source,
      rerankScore: rerankScoreById.get(source.embeddingId) ?? 0,
    }))
    .sort((left, right) => (right.rerankScore ?? 0) - (left.rerankScore ?? 0));
};

const generateReplyWithHuggingFace = async (input: {
  organization: ConversationOrganization;
  message: string;
  channel: string;
  customer?: ConversationCustomer;
  history: ConversationHistoryItem[];
  sources: RetrievedSource[];
}): Promise<{
  reply: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}> => {
  const systemPrompt = buildSystemPrompt(input.organization);
  const userPrompt = buildUserPrompt(input);

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
  const enabledFeatures = Array.isArray(input.organization.enabledFeatures) ? input.organization.enabledFeatures : [];
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

  const messages = [{ role: "user", content: userPrompt }];

  console.log("[RAG] Final system prompt", systemPrompt);
  console.log("[RAG] Final user prompt", userPrompt);

  let result = await generateActionableReplyWithOpenAi({
    system: systemPrompt,
    messages,
    tools,
    temperature: 0.2,
    maxNewTokens: 420,
  });

  if (result.toolCalls && result.toolCalls.length > 0) {
    for (const toolCall of result.toolCalls) {
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
        } catch (e: any) {
          messages.push({
            role: "assistant",
            content: null,
            tool_calls: [toolCall],
          } as any);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ success: false, message: e.message }),
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
            console.error("Failed to create ticket for tool handoff", e);
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
        } catch (e: any) {
          messages.push({
            role: "assistant",
            content: null,
            tool_calls: [toolCall],
          } as any);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ success: false, message: e.message }),
          } as any);
        }
      }
    }
    
    // Call LLM again to summarize the tool execution
    result = await generateActionableReplyWithOpenAi({
      system: systemPrompt,
      messages,
      temperature: 0.2,
      maxNewTokens: 420,
    });
  }

  const reply = result.reply || "I encountered an issue processing your request.";
  const finalPrompt = ["System:", systemPrompt, "", "User:", userPrompt, "", "Assistant:"].join("\n");
  const promptTokens = estimateTokenCount(finalPrompt);
  const completionTokens = estimateTokenCount(reply);

  return {
    reply: normalizeText(reply),
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator: generateConversationReply
// ─────────────────────────────────────────────────────────────────────────────
// Flow:
//   1. Intent Detection   → classify the message
//   2. Conversational path → greetings / smalltalk / thanks / goodbye / identity
//   3. RAG path            → embedding → vector search → rerank → LLM
//   4. Smart fallback      → warm, human‑like "I don't have that info"
// ─────────────────────────────────────────────────────────────────────────────

const generateConversationReply = async (
  input: GenerateConversationReplyInput
): Promise<GenerateConversationReplyResult> => {
  const organization = input.organization;
  const message = normalizeText(input.message);
  const channel = normalizeText(input.channel) || "website";
  const history = Array.isArray(input.history) ? input.history : [];
  const topK = typeof input.topK === "number" ? input.topK : FINAL_CONTEXT_TOP_K;

  if (!message) {
    throw new AppError("Message is required", 400);
  }

  // ── Step 1: Intent Detection ───────────────────────────────────────────
  const intentResult = detectIntent(message);

  console.log("[INTENT]", {
    message,
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    shouldRetrieve: intentResult.shouldRetrieve,
  });

  // ── Step 2: Conversational path (no retrieval needed) ──────────────────
  if (!intentResult.shouldRetrieve) {
    if (intentResult.intent === "human_handoff") {
      const reply = "I will connect you with a human agent shortly. Please hold on.";
      const usageDelta = {
        promptTokens: estimateTokenCount(message),
        completionTokens: estimateTokenCount(reply),
        totalTokens: estimateTokenCount(message) + estimateTokenCount(reply),
      };
      await incrementOrganizationTokenUsage(organization._id, usageDelta.totalTokens);
      
      const customerPhone = input.customer?.id || "";
      let activeConv: any = null;

      if (customerPhone && organization._id) {
        try {
          activeConv = await Conversation.findOneAndUpdate(
            { organizationId: organization._id, customerPhone },
            {
              status: "pending",
              responderType: "agent",
              aiEnabled: false,
              assignedAgent: null,
              lastMessageAt: new Date(),
            },
            { new: true }
          );
        } catch (e) {
          console.error("Failed to update conversation status for handoff", e);
        }
      }

      if (activeConv && organization._id) {
        emitToOrganization(String(organization._id), "incoming_handoff_alert", {
          sessionId: String(activeConv._id),
          conversationId: String(activeConv._id),
          userId: activeConv.customerPhone,
          customerName: activeConv.customerName,
          customerPhone: activeConv.customerPhone,
          reason: message,
          timestamp: activeConv.updatedAt,
        });

        emitToOrganization(String(organization._id), "conversation:updated", {
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
          organizationId: organization._id,
          conversationId: activeConv ? String(activeConv._id) : undefined,
          title: "Human Handoff Request",
          description: message || "Customer requested live human agent support.",
          customerName: input.customer?.name || activeConv?.customerName || "Customer",
          customerPhone: input.customer?.id || activeConv?.customerPhone || "",
          status: "open",
        });
        emitToOrganization(String(organization._id), "ticket:created", createdTicket);
      } catch (e) {
        console.error("Failed to create ticket for handoff", e);
      }

      return {
        reply,
        mode: "conversational",
        intent: intentResult.intent,
        retrievedSources: [],
        usage: createUsageSummary(organization, usageDelta),
      };
    }

    if (intentResult.intent === "order_request") {
      // For orders, we want to route to the RAG/Tool path because the LLM needs to 
      // collect the order info dynamically using system prompt and tools.
      // So we skip conversational return and let it continue below.
    } else {
      const orgName = normalizeText(organization.profile?.name) || "this organization";
      const reply = getConversationalResponse(intentResult.intent, orgName);

      const usageDelta = {
        promptTokens: estimateTokenCount(message),
        completionTokens: estimateTokenCount(reply),
        totalTokens: estimateTokenCount(message) + estimateTokenCount(reply),
      };

      await incrementOrganizationTokenUsage(organization._id, usageDelta.totalTokens);

      console.log("[CONVERSATIONAL] Responded without retrieval:", intentResult.intent);

      return {
        reply,
        mode: "conversational",
        intent: intentResult.intent,
        retrievedSources: [],
        usage: createUsageSummary(organization, usageDelta),
      };
    }
  }

  // ── Step 3: RAG path (business / support questions) ────────────────────
  assertOrganizationAllowsConversation(organization, channel);

  // 3a. Generate embedding
  const embeddingResult = await generateEmbeddings([message]);
  const queryVector = embeddingResult[0];

  if (!Array.isArray(queryVector) || queryVector.length === 0) {
    throw new AppError("Failed to generate embedding for the customer question", 502);
  }

  // 3b. Vector search
  const vectorSearchTopK = Math.max(
    1,
    Math.min(typeof input.topK === "number" ? Math.max(input.topK, 10) : VECTOR_SEARCH_TOP_K, 20)
  );

  const matches = (await queryKnowledgeVectors(
    organization._id,
    queryVector,
    vectorSearchTopK
  )) as Array<{
    id: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;

  const filteredMatches = matches
    .filter((match) => {
      const orgMatch =
        typeof match.metadata?.organizationId === "string"
          ? match.metadata.organizationId === String(organization._id)
          : true;

      return orgMatch && typeof match.score === "number";
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, vectorSearchTopK);

  console.log("[RAG] User question", message);
  console.log("=== VECTOR SEARCH RESULTS ===");
  console.log(
    matches.map((match) => ({
      id: match.id,
      score: match.score,
      documentId: match.metadata?.documentId,
      chunkIndex: match.metadata?.chunkIndex,
    }))
  );
  console.log("=== VECTOR SEARCH FILTERED ===");
  console.log(
    filteredMatches.map((match) => ({
      id: match.id,
      score: match.score,
      documentId: match.metadata?.documentId,
      chunkIndex: match.metadata?.chunkIndex,
    }))
  );
  console.log("[RAG] Vector search counts", {
    total: matches.length,
    filtered: filteredMatches.length,
    topK: vectorSearchTopK,
  });

  // 3c. Hydrate sources (dedupe after we confirm we have content)
  const hydratedSources = await hydrateRetrievedSources(organization._id, filteredMatches);
  const sources = dedupeSources(hydratedSources);
  const missingEmbeddingIds = filteredMatches
    .map((match) => match.id)
    .filter((id) => !hydratedSources.some((source) => source.embeddingId === id));

  if (missingEmbeddingIds.length > 0) {
    console.warn("[RAG] Missing chunks for embeddings", missingEmbeddingIds);
  }

  console.log("[RAG] Hydration summary", {
    hydrated: hydratedSources.length,
    deduped: sources.length,
  });

  const sourcesForRerank = sources.length > 0 ? sources : hydratedSources;

  // ── Step 4: Smart fallback (no relevant sources found) ─────────────────
  if (sourcesForRerank.length === 0) {
    const reply = NO_KNOWLEDGE_RESPONSE;
    const usageDelta = {
      promptTokens: estimateTokenCount(message),
      completionTokens: estimateTokenCount(reply),
      totalTokens: estimateTokenCount(message) + estimateTokenCount(reply),
    };

    await incrementOrganizationTokenUsage(organization._id, usageDelta.totalTokens);

    console.log("[FALLBACK] No relevant sources found for:", message);

    return {
      reply,
      mode: "fallback",
      intent: intentResult.intent,
      retrievedSources: [],
      usage: createUsageSummary(organization, usageDelta),
    };
  }

  // 3d. Rerank with Cohere
  let rerankedSources: RankedSource[] = sourcesForRerank;
  let rerankSucceeded = false;
  try {
    const rerankedResults = await rerankWithCohere(
      message,
      sourcesForRerank.map((source) => ({ id: source.embeddingId, text: source.content })),
      Math.min(sourcesForRerank.length, vectorSearchTopK)
    );

    console.log("=== COHERE RERANKED RESULTS ===");
    console.log(rerankedResults);
    console.log("[RAG] Rerank summary", {
      inputCount: sourcesForRerank.length,
      outputCount: rerankedResults.length,
      threshold: RERANK_SCORE_THRESHOLD,
    });

    rerankSucceeded = true;
    const ranked = applyRerankScores(sourcesForRerank, rerankedResults).slice(
      0,
      Math.max(topK, FINAL_CONTEXT_TOP_K)
    );
    const filteredByRerank = ranked.filter(
      (source) => (source.rerankScore ?? 0) >= RERANK_SCORE_THRESHOLD
    );
    rerankedSources = filteredByRerank.length > 0 ? filteredByRerank : ranked;
  } catch (error) {
    console.warn("[RAG] Cohere rerank failed, using vector ranking", error);
    rerankedSources = sourcesForRerank
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);
  }

  const fallbackSources: RankedSource[] = sourcesForRerank
    .slice(0, topK)
    .map((source) => ({ ...source, rerankScore: undefined }));

  if (rerankSucceeded && rerankedSources.length === 0) {
    rerankedSources = fallbackSources;
  }

  const finalSources = trimSourcesToBudget(
    rerankedSources.length > 0 ? rerankedSources : fallbackSources,
    MAX_CONTEXT_CHARS
  );

  console.log("[RAG] Final context summary", {
    selected: finalSources.length,
    totalChars: finalSources.reduce((sum, source) => sum + source.content.length, 0),
  });

  console.log("=== FINAL CONTEXT SENT TO LLM ===");
  console.log(
    finalSources.map((source) => ({
      embeddingId: source.embeddingId,
      score: source.score,
      rerankScore: source.rerankScore ?? null,
      documentName: source.documentName,
      chunkIndex: source.chunkIndex,
      excerpt: clipText(source.content, 220),
    }))
  );

  // 3e. Generate LLM response with retrieved context
  try {
    const completion = await generateReplyWithHuggingFace({
      organization,
      message,
      history,
      channel,
      customer: input.customer,
      sources: finalSources,
    });

    const totalTokens =
      completion.totalTokens > 0
        ? completion.totalTokens
        : estimateTokenCount(message) + estimateTokenCount(completion.reply);

    const usageDelta = {
      promptTokens:
        completion.promptTokens > 0 ? completion.promptTokens : estimateTokenCount(message),
      completionTokens:
        completion.completionTokens > 0
          ? completion.completionTokens
          : estimateTokenCount(completion.reply),
      totalTokens,
    };

    await incrementOrganizationTokenUsage(organization._id, usageDelta.totalTokens);

    return {
      reply: completion.reply,
      mode: "rag",
      intent: intentResult.intent,
      retrievedSources: finalSources.map(({ content, ...source }) => source),
      usage: createUsageSummary(organization, usageDelta),
    };
  } catch (error) {
    console.error("[RAG] LLM generation failed", error);
    const reply = buildFallbackFromSources(organization);
    const usageDelta = {
      promptTokens: estimateTokenCount(message),
      completionTokens: estimateTokenCount(reply),
      totalTokens: estimateTokenCount(message) + estimateTokenCount(reply),
    };

    await incrementOrganizationTokenUsage(organization._id, usageDelta.totalTokens);

    return {
      reply,
      mode: "fallback",
      intent: intentResult.intent,
      retrievedSources: finalSources.map(({ content, ...source }) => source),
      usage: createUsageSummary(organization, usageDelta),
    };
  }
};

export {
  generateConversationReply,
};

