import Ticket from "../../models/Ticket";
import Conversation from "../../models/Conversation";

import { AppError } from "../../utils/appError";
import { createLogger } from "../../utils/logger";
import { generateEmbeddings } from "../embedding.service";
import { queryKnowledgeVectors } from "../pinecone.service";
import { rerankWithCohere } from "../rerank.service";
import { detectIntent, getConversationalResponse } from "../intentDetection.service";
import { emitToOrganization } from "../socket.service";
import { generateReplyWithHuggingFace } from "./generation";
import { buildFallbackFromSources } from "./prompts";
import {
  applyRerankScores,
  dedupeSources,
  hydrateRetrievedSources,
  trimSourcesToBudget,
} from "./retrieval";
import {
  FINAL_CONTEXT_TOP_K,
  MAX_CONTEXT_CHARS,
  NO_KNOWLEDGE_RESPONSE,
  RERANK_SCORE_THRESHOLD,
  VECTOR_SEARCH_TOP_K,
  clipText,
  estimateTokenCount,
  normalizeText,
} from "./shared";
import type {
  GenerateConversationReplyInput,
  GenerateConversationReplyResult,
  RankedSource,
} from "./types";
import {
  assertOrganizationAllowsConversation,
  createUsageSummary,
  incrementOrganizationTokenUsage,
} from "./usage";

const log = createLogger("RAG");

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

  log.debug("[INTENT]", {
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
          log.error("Failed to update conversation status for handoff", e);
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
        log.error("Failed to create ticket for handoff", e);
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

      log.debug("[CONVERSATIONAL] Responded without retrieval:", intentResult.intent);

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

  log.debug("User question", message);
  log.debug(
    "Vector search results",
    matches.map((match) => ({
      id: match.id,
      score: match.score,
      documentId: match.metadata?.documentId,
      chunkIndex: match.metadata?.chunkIndex,
    }))
  );
  log.debug(
    "Vector search results after filtering",
    filteredMatches.map((match) => ({
      id: match.id,
      score: match.score,
      documentId: match.metadata?.documentId,
      chunkIndex: match.metadata?.chunkIndex,
    }))
  );
  log.debug("Vector search counts", {
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
    log.warn("Missing chunks for embeddings", missingEmbeddingIds);
  }

  log.debug("Hydration summary", {
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

    log.debug("[FALLBACK] No relevant sources found for:", message);

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

    log.debug("Cohere reranked results", rerankedResults);
    log.debug("Rerank summary", {
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
    log.warn("Cohere rerank failed, using vector ranking", error);
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

  log.debug("Final context summary", {
    selected: finalSources.length,
    totalChars: finalSources.reduce((sum, source) => sum + source.content.length, 0),
  });

  log.debug(
    "Final context sent to LLM",
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
    log.error("LLM generation failed", error);
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
