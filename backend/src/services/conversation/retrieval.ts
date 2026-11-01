import KnowledgeChunk from "../../models/KnowledgeChunk";

import { clipText, normalizeForDedupe, normalizeText } from "./shared";
import type { RankedSource, RetrievedSource } from "./types";

export const hydrateRetrievedSources = async (
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

export const trimSourcesToBudget = <T extends RetrievedSource>(sources: T[], maxChars: number): T[] => {
  if (sources.length === 0) {
    return [];
  }

  let totalChars = 0;
  const trimmed: T[] = [];

  for (const source of sources) {
    const contentLength = source.content.length;
    if (totalChars + contentLength > maxChars && trimmed.length > 0) {
      break;
    }

    trimmed.push(source);
    totalChars += contentLength;
  }

  return trimmed;
};

export const dedupeSources = (sources: RetrievedSource[]): RetrievedSource[] => {
  const seen = new Set<string>();

  return sources.filter((source) => {
    const key = normalizeForDedupe(source.content);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const applyRerankScores = (
  sources: RetrievedSource[],
  reranked: Array<{ id: string; score: number }>
): RankedSource[] => {
  const rerankScoreById = new Map(reranked.map((result) => [result.id, result.score]));

  return sources
    .map((source) => ({
      ...source,
      rerankScore: rerankScoreById.get(source.embeddingId) ?? 0,
    }))
    .sort((left, right) => (right.rerankScore ?? 0) - (left.rerankScore ?? 0));
};
