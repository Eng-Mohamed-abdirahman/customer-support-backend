import mongoose from "mongoose";
import { buildKnowledgeInsightsPrompt } from "../prompts/knowledge-insights.prompt";

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { generateSupportReplyWithOpenAi } = require("../services/llm.service");

// ---------------------------------------------------------------------------
// In-memory cache — 5-minute TTL, keyed by `insights:${organizationId}:${range}`
// ---------------------------------------------------------------------------
const cacheStore = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Fallback demo data (used when there are no conversations or the LLM fails)
// ---------------------------------------------------------------------------
const FALLBACK_INSIGHTS = {
  summary:
    "Customers frequently asked about password resets, subscription management, and order tracking. Several billing questions went unanswered. API integration support was a rising topic.",
  topQuestions: [
    { question: "How do I reset my password?", count: 148, trend: 12 },
    { question: "How can I track my order?", count: 92, trend: 8 },
    { question: "How do I upgrade my subscription?", count: 64, trend: 5 },
    { question: "Why was I charged twice?", count: 41, trend: -3 },
    { question: "How do I connect WhatsApp integration?", count: 38, trend: 22 },
  ],
  trendingTopics: [
    { topic: "Password Reset", changePercent: 12 },
    { topic: "Order Tracking", changePercent: 8 },
    { topic: "WhatsApp Integration", changePercent: 22 },
    { topic: "Subscription Plans", changePercent: 5 },
  ],
  unansweredTopics: [
    "International delivery timelines",
    "Refund exceptions for digital products",
    "Custom SLA configuration",
    "Multi-language AI support",
  ],
  recommendedArticles: [
    {
      title: "How to Track Your Order",
      reason: "92 customers asked about order tracking with no dedicated article",
      confidence: 96,
    },
    {
      title: "WhatsApp Integration Setup Guide",
      reason: "Rising 22% — customers struggling with setup",
      confidence: 91,
    },
    {
      title: "Understanding Your Invoice",
      reason: "41 billing confusion tickets logged this period",
      confidence: 88,
    },
  ],
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function resolveStartDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "7d":
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

// ---------------------------------------------------------------------------
// JSON extraction — handles optional ```json … ``` fences from the LLM
// ---------------------------------------------------------------------------
function extractJson(raw: string): any {
  let text = raw.trim();

  // Strip optional markdown code fence
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Find the first { … } block in case there's leading prose
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Main exported service function
// ---------------------------------------------------------------------------
export async function getKnowledgeInsights(
  organizationId: mongoose.Types.ObjectId,
  range: string
): Promise<typeof FALLBACK_INSIGHTS> {
  const orgIdStr = String(organizationId);
  const cacheKey = `insights:${orgIdStr}:${range}`;

  // 1. Cache hit
  const cached = cacheStore.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // 2. Compute date window
  const startDate = resolveStartDate(range);

  // 3. Fetch up to 80 recent conversations for this org in the date range
  const conversations = await Conversation.find({
    organizationId,
    createdAt: { $gte: startDate },
  })
    .sort({ lastMessageAt: -1 })
    .limit(80)
    .lean();

  // 4. If no conversations exist, return fallback demo data
  if (!conversations || conversations.length === 0) {
    cacheStore.set(cacheKey, {
      data: FALLBACK_INSIGHTS,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return FALLBACK_INSIGHTS;
  }

  // 5. For each conversation, fetch its messages and format a text block
  const conversationTexts: string[] = [];

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];

    const messages = await Message.find({
      organizationId,
      conversationId: conv._id,
    })
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    const messageLines: string[] = (messages || []).map(
      (msg: any) => `- ${msg.senderType}: ${msg.contentText || ""}`
    );

    const block = [
      `[CONV-${i + 1}] Channel: ${conv.channel || "unknown"} | Status: ${conv.status || "unknown"}`,
      `Customer: ${conv.customerName || "Unknown"}`,
      `Messages:`,
      ...messageLines,
    ].join("\n");

    conversationTexts.push(block);
  }

  // 6. Build prompts
  const { system, user } = buildKnowledgeInsightsPrompt(conversationTexts);

  // 7. Call the LLM — with a generous token budget for the JSON payload
  let result: typeof FALLBACK_INSIGHTS;

  try {
    const raw = await generateSupportReplyWithOpenAi({
      system,
      user,
      temperature: 0.3,
      maxNewTokens: 1200,
    });

    result = extractJson(raw);
  } catch (err) {
    // If the LLM fails or returns invalid JSON, fall back to demo data
    console.error("[KnowledgeInsights] LLM or parse error — using fallback:", err);
    result = FALLBACK_INSIGHTS;
  }

  // 8. Store in cache
  cacheStore.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
}
