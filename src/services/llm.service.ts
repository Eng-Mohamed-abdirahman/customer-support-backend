const OpenAI = require("openai");

const { env } = require("../config/env");
const { AppError } = require("../utils/appError");

const OpenAIClient = OpenAI?.default ?? OpenAI;
let openAiClient: any = null;

const getOpenAiClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new AppError("OPENAI_API_KEY is not configured", 500);
  }

  if (!openAiClient) {
    openAiClient = new OpenAIClient({
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

  console.log("[LLM] Request", {
    model,
    mode: "openai",
    systemChars: (input.system || "").length,
    userChars: (input.user || "").length,
    maxNewTokens: typeof input.maxNewTokens === "number" ? input.maxNewTokens : 420,
    temperature: typeof input.temperature === "number" ? input.temperature : 0.2,
  });

  const response = (await client.responses.create({
    model,
    temperature: typeof input.temperature === "number" ? input.temperature : 0.2,
    max_output_tokens: typeof input.maxNewTokens === "number" ? input.maxNewTokens : 420,
    input: [
      ...(input.system ? [{ role: "system", content: input.system }] : []),
      { role: "user", content: input.user || "" },
    ],
  })) as any;

  const generatedText = (response?.output_text || "").trim();

  console.log("[LLM] Response", {
    responseType: typeof response,
    outputChars: generatedText.length,
  });

  if (!generatedText) {
    throw new AppError("OpenAI returned an empty response", 502);
  }

  return generatedText;
};

module.exports = {
  generateSupportReplyWithOpenAi,
};

export {};