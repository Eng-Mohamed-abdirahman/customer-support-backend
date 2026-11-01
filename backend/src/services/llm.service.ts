import OpenAI from "openai";

import { env } from "../config/env";
import { AppError } from "../utils/appError";
import { createLogger } from "../utils/logger";

const log = createLogger("LLM");

let openAiClient: OpenAI | null = null;

const getOpenAiClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new AppError("OPENAI_API_KEY is not configured", 500);
  }

  if (!openAiClient) {
    openAiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return openAiClient;
};

const generateSupportReplyWithOpenAi = async (input: {
  system?: string;
  user?: string;
  temperature?: number;
  maxNewTokens?: number;
}): Promise<string> => {
  const client = getOpenAiClient();
  const model = env.OPENAI_LLM_MODEL || "gpt-4o-mini";

  log.debug("[LLM] Request", {
    model,
    mode: "openai",
    systemChars: (input.system || "").length,
    userChars: (input.user || "").length,
    maxNewTokens: typeof input.maxNewTokens === "number" ? input.maxNewTokens : 420,
    temperature: typeof input.temperature === "number" ? input.temperature : 0.2,
  });

  const response = await client.chat.completions.create({
    model,
    temperature: typeof input.temperature === "number" ? input.temperature : 0.2,
    max_tokens: typeof input.maxNewTokens === "number" ? input.maxNewTokens : 420,
    messages: [
      ...(input.system ? [{ role: "system" as const, content: input.system }] : []),
      { role: "user" as const, content: input.user || "" },
    ],
  });

  const generatedText = (response.choices[0]?.message?.content || "").trim();

  log.debug("[LLM] Response", {
    responseType: typeof response,
    outputChars: generatedText.length,
  });

  if (!generatedText) {
    throw new AppError("OpenAI returned an empty response", 502);
  }

  return generatedText;
};

const generateActionableReplyWithOpenAi = async (input: {
  system?: string;
  messages: any[];
  tools?: any[];
  temperature?: number;
  maxNewTokens?: number;
}): Promise<{
  reply: string | null;
  toolCalls?: any[];
}> => {
  const client = getOpenAiClient();
  const model = env.OPENAI_LLM_MODEL || "gpt-4o-mini";

  log.debug("[LLM Actionable] Request", {
    model,
    mode: "openai_tools",
    messageCount: input.messages.length,
    tools: input.tools?.map((t) => t.function.name) || [],
  });

  const requestBody: any = {
    model,
    temperature: typeof input.temperature === "number" ? input.temperature : 0.2,
    max_tokens: typeof input.maxNewTokens === "number" ? input.maxNewTokens : 420,
    messages: [
      ...(input.system ? [{ role: "system" as const, content: input.system }] : []),
      ...input.messages,
    ],
  };

  if (input.tools && input.tools.length > 0) {
    requestBody.tools = input.tools;
    requestBody.tool_choice = "auto";
  }

  const response = await client.chat.completions.create(requestBody);

  const message = response.choices[0]?.message;

  if (message?.tool_calls && message.tool_calls.length > 0) {
    return {
      reply: message.content,
      toolCalls: message.tool_calls,
    };
  }

  return {
    reply: (message?.content || "").trim(),
  };
};

export {
  generateSupportReplyWithOpenAi,
  generateActionableReplyWithOpenAi,
};

