import type { ConversationOrganization } from "./types";

export const VECTOR_SEARCH_TOP_K = 18;
export const FINAL_CONTEXT_TOP_K = 5;
export const MAX_CONTEXT_CHARS = 4200;
export const MAX_HISTORY_ITEMS = 8;
export const RERANK_SCORE_THRESHOLD = 0.15;

export const estimateTokenCount = (value: string): number => {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
};

export const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
};

export const normalizeForDedupe = (value: string): string => {
  return normalizeText(value).toLowerCase();
};

export const clipText = (value: string, max = 420): string => {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max).trim()}...`;
};

export const defaultFallbackMessage =
  "I don't have that specific information right now, but I'd be happy to help with something else! You can also reach out to our support team for further assistance. 😊";

export const NO_KNOWLEDGE_RESPONSE =
  "I couldn't find that information right now, but I'd be happy to help with something else. Could you share more details or try rephrasing your question?";

export const resolveFallbackMessage = (organization: ConversationOrganization): string => {
  const configured = normalizeText(organization?.supportSettings?.fallbackMessage);

  return configured || defaultFallbackMessage;
};
