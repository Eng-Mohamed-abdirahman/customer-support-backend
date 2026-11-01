import { env } from "../config/env";
import { AppError } from "../utils/appError";

type RerankInputDocument = {
  id: string;
  text: string;
};

type RerankResult = {
  id: string;
  score: number;
  index: number;
};

const DEFAULT_RERANK_MODEL = "rerank-english-v3.0";

const sanitizeModelName = (value: string): string => {
  return value.replace(/[",\s]+/g, "").trim();
};

const assertCohereConfig = () => {
  if (!env.COHERE_API_KEY) {
    throw new AppError("COHERE_API_KEY is not configured", 500);
  }
};

const rerankWithCohere = async (
  query: string,
  documents: RerankInputDocument[],
  topN?: number
): Promise<RerankResult[]> => {
  assertCohereConfig();

  if (!query.trim() || documents.length === 0) {
    return [];
  }

  const modelName = sanitizeModelName(env.COHERE_RERANK_MODEL || DEFAULT_RERANK_MODEL);

  const response = await fetch("https://api.cohere.com/v1/rerank", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.COHERE_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      query,
      documents: documents.map((doc) => doc.text),
      top_n: typeof topN === "number" ? Math.max(1, topN) : documents.length,
      return_documents: false,
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { message?: string; error?: { message?: string } }
      | null;
    const message = errorBody?.error?.message ?? errorBody?.message ?? "Cohere rerank failed";
    throw new AppError(message, 502);
  }

  const body = (await response.json().catch(() => null)) as
    | { results?: Array<{ index?: number; relevance_score?: number }> }
    | null;

  if (!Array.isArray(body?.results)) {
    return [];
  }

  return body.results
    .map((result) => {
      const index = typeof result.index === "number" ? result.index : -1;
      const score = typeof result.relevance_score === "number" ? result.relevance_score : 0;

      if (index < 0 || index >= documents.length) {
        return null;
      }

      return {
        id: documents[index].id,
        score,
        index,
      } as RerankResult;
    })
    .filter((result): result is RerankResult => Boolean(result));
};

export {
  rerankWithCohere,
};

