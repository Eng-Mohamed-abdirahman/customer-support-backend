/**
 * Builds the system + user prompt pair for the AI Knowledge Insights analysis.
 *
 * The LLM is instructed to act as an "AI Knowledge Analyst" and return
 * ONLY valid JSON — no markdown fences, no prose.
 */
export function buildKnowledgeInsightsPrompt(
  conversationTexts: string[]
): { system: string; user: string } {
  const system = `You are an AI Knowledge Analyst for a customer support platform.
Your task is to analyze a batch of customer support conversations and extract structured knowledge insights.

You MUST return ONLY valid JSON — no markdown, no code fences, no explanation, no commentary.
The JSON must strictly conform to this schema:

{
  "summary": "string — 2-3 sentence overview of what customers are asking about in this period",
  "topQuestions": [
    { "question": "string", "count": number, "trend": number }
  ],
  "trendingTopics": [
    { "topic": "string", "changePercent": number }
  ],
  "unansweredTopics": ["string"],
  "recommendedArticles": [
    { "title": "string", "reason": "string", "confidence": number }
  ]
}

RULES:
1. Group similar questions together. For example: "forgot password", "reset password", "can't log in", "password not working" all count as one question "How do I reset my password?". Use the most natural phrasing.
2. "count" is the approximate number of conversations containing that question (extrapolate from the sample).
3. "trend" is an integer representing percentage change vs. the prior period (positive = rising, negative = falling). Estimate it from the data patterns.
4. "changePercent" for trendingTopics follows the same rule as "trend".
5. Detect unansweredTopics: topics where a customer asked something but no agent or AI replied, OR the conversation is still open with no resolution. List these as plain strings (the unanswered question or topic).
6. recommendedArticles: suggest knowledge base articles that would reduce support volume. "confidence" is a number 0-100.
7. Return at most 8 topQuestions, 6 trendingTopics, 6 unansweredTopics, and 5 recommendedArticles.
8. Do NOT output any text outside the JSON object. Start your response with { and end with }.`;

  const conversationBlock = conversationTexts
    .slice(0, 60)
    .join("\n\n");

  const user = `Analyze the following ${conversationTexts.length} customer support conversation(s) and return the knowledge insights JSON.

--- CONVERSATIONS START ---
${conversationBlock}
--- CONVERSATIONS END ---

Remember: return ONLY the JSON object. No markdown, no explanation.`;

  return { system, user };
}
