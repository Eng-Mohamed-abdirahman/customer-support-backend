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
// Empty + heuristic insights built from real conversation data
// ---------------------------------------------------------------------------
const EMPTY_INSIGHTS = {
  summary:
    "No customer conversations were found for this period. Insights will appear once your team starts handling support conversations.",
  topQuestions: [] as Array<{ question: string; count: number; trend: number }>,
  trendingTopics: [] as Array<{ topic: string; changePercent: number }>,
  unansweredTopics: [] as string[],
  recommendedArticles: [] as Array<{ title: string; reason: string; confidence: number }>,
};

function normalizeQuestion(text: string) {
  return text.trim().replace(/\s+/g, " ").slice(0, 160);
}

function buildHeuristicInsights(conversationTexts: string[]) {
  if (!conversationTexts.length) {
    return EMPTY_INSIGHTS;
  }

  const questionCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();
  const unanswered = new Set<string>();

  for (const block of conversationTexts) {
    const lines = block.split("\n");
    let lastCustomerMessage = "";

    for (const line of lines) {
      if (line.startsWith("- customer:")) {
        lastCustomerMessage = line.replace("- customer:", "").trim();
        if (lastCustomerMessage.includes("?")) {
          const question = normalizeQuestion(lastCustomerMessage);
          questionCounts.set(question, (questionCounts.get(question) ?? 0) + 1);
        }

        const topicMatch = lastCustomerMessage.match(
          /\b(billing|refund|password|order|subscription|whatsapp|integration|api|pricing|delivery)\b/i
        );
        if (topicMatch) {
          const topic = topicMatch[1].toLowerCase();
          topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
        }
        continue;
      }

      if (
        line.startsWith("- assistant:") &&
        lastCustomerMessage &&
        /(i don't know|i am not sure|unable to|cannot find|no information)/i.test(line)
      ) {
        unanswered.add(normalizeQuestion(lastCustomerMessage));
      }
    }
  }

  const topQuestions = Array.from(questionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([question, count]) => ({
      question,
      count,
      trend: 0,
    }));

  const trendingTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([topic, count]) => ({
      topic: topic.charAt(0).toUpperCase() + topic.slice(1),
      changePercent: count,
    }));

  const recommendedArticles = topQuestions.slice(0, 3).map((item) => ({
    title: item.question.endsWith("?") ? item.question : `${item.question}?`,
    reason: `${item.count} customers asked about this during the selected period`,
    confidence: Math.min(99, 70 + item.count * 3),
  }));

  return {
    summary: `Analyzed ${conversationTexts.length} conversations from your support channels. ${
      topQuestions.length > 0
        ? `Customers most often asked about "${topQuestions[0].question}".`
        : "No repeated customer questions were detected yet."
    }`,
    topQuestions,
    trendingTopics,
    unansweredTopics: Array.from(unanswered).slice(0, 6),
    recommendedArticles,
  };
}

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
): Promise<typeof EMPTY_INSIGHTS> {
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

  // 4. If no conversations exist, return an empty real report
  if (!conversations || conversations.length === 0) {
    cacheStore.set(cacheKey, {
      data: EMPTY_INSIGHTS,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return EMPTY_INSIGHTS;
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
  let result: typeof EMPTY_INSIGHTS;

  try {
    const raw = await generateSupportReplyWithOpenAi({
      system,
      user,
      temperature: 0.3,
      maxNewTokens: 1200,
    });

    result = extractJson(raw);
  } catch (err) {
    console.error("[KnowledgeInsights] LLM or parse error — using heuristic insights:", err);
    result = buildHeuristicInsights(conversationTexts);
  }

  // 8. Store in cache
  cacheStore.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
}
