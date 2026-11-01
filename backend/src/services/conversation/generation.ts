import { generateActionableReplyWithOpenAi } from "../llm.service";
import { createLogger } from "../../utils/logger";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";
import { estimateTokenCount, normalizeText } from "./shared";
import { buildConversationTools, executeToolCalls } from "./tools";
import type {
  ConversationCustomer,
  ConversationHistoryItem,
  ConversationOrganization,
  RetrievedSource,
} from "./types";

const log = createLogger("RAG");

export const generateReplyWithHuggingFace = async (input: {
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
  const tools = buildConversationTools(input.organization);

  const messages = [{ role: "user", content: userPrompt }];

  log.debug("Final system prompt", systemPrompt);
  log.debug("Final user prompt", userPrompt);

  let result = await generateActionableReplyWithOpenAi({
    system: systemPrompt,
    messages,
    tools,
    temperature: 0.2,
    maxNewTokens: 420,
  });

  if (result.toolCalls && result.toolCalls.length > 0) {
    await executeToolCalls(result.toolCalls, input, messages);

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
