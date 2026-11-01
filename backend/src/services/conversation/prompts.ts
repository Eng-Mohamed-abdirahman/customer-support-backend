import {
  MAX_HISTORY_ITEMS,
  clipText,
  normalizeForDedupe,
  normalizeText,
  resolveFallbackMessage,
} from "./shared";
import type {
  ConversationCustomer,
  ConversationHistoryItem,
  ConversationOrganization,
  RetrievedSource,
} from "./types";

export const buildHistoryForPrompt = (history: ConversationHistoryItem[], latestMessage: string): string => {
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

export const isWhoAreYouQuestion = (message: string): boolean => {
  const normalized = normalizeText(message).toLowerCase();
  return ["who are you", "who r you", "who is this", "who am i talking to"]
    .some((phrase) => normalized.includes(phrase));
};

export const buildOrganizationContext = (organization: ConversationOrganization): string => {
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
export const buildStructuredKnowledgeContext = (sources: RetrievedSource[]): string => {
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

export const buildFallbackFromSources = (organization: ConversationOrganization): string => {
  return resolveFallbackMessage(organization);
};

export const buildSystemPrompt = (organization: ConversationOrganization): string => {
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

export const buildUserPrompt = (input: {
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
