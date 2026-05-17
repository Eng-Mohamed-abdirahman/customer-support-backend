const OpenAI = require("openai");

const Organization = require("../models/Organization");
const KnowledgeChunk = require("../models/KnowledgeChunk");

const { env } = require("../config/env");
const { AppError } = require("../utils/appError");
const { generateEmbeddings } = require("./embedding.service");
const { queryKnowledgeVectors } = require("./pinecone.service");

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
  aiSettings?: {
    aiEnabled?: boolean;
    autoReplyEnabled?: boolean;
    humanHandoffEnabled?: boolean;
    modelName?: string;
  };
  allowedChannels?: string[];
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

type UsageSummary = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalTokensUsed: number;
  monthlyLimit: number;
};

type GenerateConversationReplyResult = {
  reply: string;
  mode: "rag" | "fallback";
  retrievedSources: Array<Omit<RetrievedSource, "content">>;
  usage: UsageSummary;
};

const OpenAIClient = OpenAI?.default ?? OpenAI;

let openAiClient: any = null;

const estimateTokenCount = (value: string): number => {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
};

const getOpenAiClient = () => {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  if (!openAiClient) {
    openAiClient = new OpenAIClient({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return openAiClient;
};

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
};

const clipText = (value: string, max = 420): string => {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max).trim()}...`;
};

const defaultFallbackMessage =
  "Our team will get back to you shortly. Please share a few more details about your request.";

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

const formatHistory = (history: ConversationHistoryItem[]): string => {
  if (!Array.isArray(history) || history.length === 0) {
    return "";
  }

  return history
    .slice(-8)
    .map((item) => `${item.role === "assistant" ? "Assistant" : "Customer"}: ${item.content}`)
    .join("\n");
};

const buildOrganizationContext = (organization: ConversationOrganization): string => {
  const businessInfo = organization.businessInfo ?? {};
  const contact = organization.contact ?? {};
  const supportSettings = organization.supportSettings ?? {};

  return [
    `Organization: ${normalizeText(organization.profile?.name) || "Unknown"}`,
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

const buildRetrievedContext = (sources: RetrievedSource[]): string => {
  if (sources.length === 0) {
    return "";
  }

  return sources
    .map((source, index) => {
      return [
        `[Source ${index + 1}]`,
        `Document: ${source.documentName}`,
        `Chunk: ${source.chunkIndex}`,
        `Score: ${source.score.toFixed(4)}`,
        `Content: ${clipText(source.content, 1400)}`,
      ].join("\n");
    })
    .join("\n\n");
};

const buildFallbackFromSources = (
  organization: ConversationOrganization,
  sources: RetrievedSource[]
): string => {
  if (sources.length === 0) {
    return resolveFallbackMessage(organization);
  }

  return [
    "Based on our knowledge base, here is the most relevant information:",
    clipText(sources[0].content, 520),
  ].join("\n\n");
};

const generateReplyWithOpenAi = async (input: {
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
  const client = getOpenAiClient();

  if (!client) {
    throw new AppError("OPENAI_API_KEY is not configured", 500);
  }

  const fallbackMessage = resolveFallbackMessage(input.organization);
  const organizationContext = buildOrganizationContext(input.organization);
  const historyText = formatHistory(input.history);
  const retrievedContext = buildRetrievedContext(input.sources);
  const customerName = normalizeText(input.customer?.name) || "Unknown";
  const customerEmail = normalizeText(input.customer?.email) || "Unknown";
  const customerId = normalizeText(input.customer?.id) || "Unknown";

  const systemPrompt = [
    "You are a customer support assistant that must answer using retrieved context from the organization knowledge base.",
    "Never invent policies, pricing, or facts that are not present in the provided context.",
    "If context is insufficient, reply with the fallback message exactly and ask for clarification.",
    `Fallback message: ${fallbackMessage}`,
    "Keep responses concise, helpful, and ready to send to customers.",
  ].join("\n");

  const userPrompt = [
    `Channel: ${input.channel}`,
    `Customer ID: ${customerId}`,
    `Customer name: ${customerName}`,
    `Customer email: ${customerEmail}`,
    "",
    "Organization context:",
    organizationContext,
    "",
    historyText ? `Recent conversation:\n${historyText}\n` : "",
    "Customer question:",
    input.message,
    "",
    retrievedContext
      ? `Retrieved knowledge chunks:\n${retrievedContext}`
      : "Retrieved knowledge chunks: none",
  ]
    .filter(Boolean)
    .join("\n");

  const modelName = normalizeText(input.organization?.aiSettings?.modelName) || "gpt-4o-mini";

  const response = (await client.responses.create({
    model: modelName,
    temperature: 0.2,
    max_output_tokens: 500,
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  })) as any;

  const reply = normalizeText(response?.output_text);

  if (!reply) {
    throw new AppError("OpenAI returned an empty response", 502);
  }

  const promptTokens =
    typeof response?.usage?.input_tokens === "number" ? response.usage.input_tokens : 0;
  const completionTokens =
    typeof response?.usage?.output_tokens === "number" ? response.usage.output_tokens : 0;
  const totalTokens =
    typeof response?.usage?.total_tokens === "number"
      ? response.usage.total_tokens
      : promptTokens + completionTokens;

  return {
    reply,
    promptTokens,
    completionTokens,
    totalTokens,
  };
};

const generateConversationReply = async (
  input: GenerateConversationReplyInput
): Promise<GenerateConversationReplyResult> => {
  const organization = input.organization;
  const message = normalizeText(input.message);
  const channel = normalizeText(input.channel) || "website";
  const history = Array.isArray(input.history) ? input.history : [];
  const topK = typeof input.topK === "number" ? input.topK : 5;

  if (!message) {
    throw new AppError("Message is required", 400);
  }

  assertOrganizationAllowsConversation(organization, channel);

  const embeddingResult = await generateEmbeddings([message]);
  const queryVector = embeddingResult[0];

  if (!Array.isArray(queryVector) || queryVector.length === 0) {
    throw new AppError("Failed to generate embedding for the customer question", 502);
  }

  const matches = (await queryKnowledgeVectors(organization._id, queryVector, topK)) as Array<{
    id: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;

  const sources = await hydrateRetrievedSources(organization._id, matches);

  if (sources.length === 0) {
    const reply = resolveFallbackMessage(organization);
    const usageDelta = {
      promptTokens: estimateTokenCount(message),
      completionTokens: estimateTokenCount(reply),
      totalTokens: estimateTokenCount(message) + estimateTokenCount(reply),
    };

    await incrementOrganizationTokenUsage(organization._id, usageDelta.totalTokens);

    return {
      reply,
      mode: "fallback",
      retrievedSources: [],
      usage: createUsageSummary(organization, usageDelta),
    };
  }

  try {
    const completion = await generateReplyWithOpenAi({
      organization,
      message,
      history,
      channel,
      customer: input.customer,
      sources,
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
      retrievedSources: sources.map(({ content, ...source }) => source),
      usage: createUsageSummary(organization, usageDelta),
    };
  } catch {
    const reply = buildFallbackFromSources(organization, sources);
    const usageDelta = {
      promptTokens: estimateTokenCount(message),
      completionTokens: estimateTokenCount(reply),
      totalTokens: estimateTokenCount(message) + estimateTokenCount(reply),
    };

    await incrementOrganizationTokenUsage(organization._id, usageDelta.totalTokens);

    return {
      reply,
      mode: "fallback",
      retrievedSources: sources.map(({ content, ...source }) => source),
      usage: createUsageSummary(organization, usageDelta),
    };
  }
};

module.exports = {
  generateConversationReply,
};

export {};