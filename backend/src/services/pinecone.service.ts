import { env } from "../config/env";
import { AppError } from "../utils/appError";

type KnowledgeVector = {
  id: string;
  values: number[];
  metadata: {
    organizationId: string;
    documentId: string;
    chunkIndex: number;
    originalName: string;
    mimeType: string;
    [key: string]: unknown;
  };
};

type KnowledgeVectorMatch = {
  id: string;
  score: number;
  metadata: {
    organizationId?: string;
    documentId?: string;
    chunkIndex?: number;
    originalName?: string;
    mimeType?: string;
    [key: string]: unknown;
  };
};

let cachedIndexHost: string | null = env.PINECONE_INDEX_HOST || null;

const getPineconeNamespace = (organizationId: string): string => {
  return `org_${organizationId}`;
};

const assertPineconeConfig = () => {
  if (!env.PINECONE_API_KEY) {
    throw new AppError("PINECONE_API_KEY is not configured", 500);
  }

  if (!env.PINECONE_INDEX_NAME && !env.PINECONE_INDEX_HOST) {
    throw new AppError("PINECONE_INDEX_NAME or PINECONE_INDEX_HOST is not configured", 500);
  }
};

const buildPineconeHeaders = () => ({
  "Api-Key": env.PINECONE_API_KEY,
  "Content-Type": "application/json",
  "X-Pinecone-API-Version": "2025-10",
});

const parsePineconeError = async (response: Response, fallbackMessage: string) => {
  const body = (await response.json().catch(() => null)) as
    | { message?: string; error?: { message?: string } }
    | null;

  return body?.error?.message ?? body?.message ?? fallbackMessage;
};

const normalizeIndexHost = (host: string) => {
  return host.replace(/^https?:\/\//, "").replace(/\/$/, "");
};

const getPineconeIndexHost = async (): Promise<string> => {
  assertPineconeConfig();

  if (cachedIndexHost) {
    return normalizeIndexHost(cachedIndexHost);
  }

  const response = await fetch(
    `https://api.pinecone.io/indexes/${encodeURIComponent(env.PINECONE_INDEX_NAME)}`,
    {
      method: "GET",
      headers: buildPineconeHeaders(),
    }
  );

  if (!response.ok) {
    const message = await parsePineconeError(response, "Failed to resolve Pinecone index host");
    throw new AppError(message, 502);
  }

  const body = (await response.json().catch(() => null)) as { host?: string } | null;

  if (!body?.host) {
    throw new AppError("Pinecone index host was not returned", 502);
  }

  cachedIndexHost = body.host;
  return normalizeIndexHost(body.host);
};

const callPineconeDataApi = async (path: string, payload: Record<string, unknown>) => {
  const host = await getPineconeIndexHost();
  const response = await fetch(`https://${host}${path}`, {
    method: "POST",
    headers: buildPineconeHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await parsePineconeError(response, "Pinecone request failed");
    throw new AppError(message, 502);
  }
};

const upsertKnowledgeVectors = async (
  organizationId: string,
  vectors: KnowledgeVector[]
): Promise<string> => {
  const namespace = getPineconeNamespace(organizationId);

  if (vectors.length === 0) {
    return namespace;
  }

  const batchSize = 100;
  for (let offset = 0; offset < vectors.length; offset += batchSize) {
    const batch = vectors.slice(offset, offset + batchSize);

    await callPineconeDataApi("/vectors/upsert", {
      namespace,
      vectors: batch,
    });
  }

  return namespace;
};

const deleteKnowledgeVectors = async (
  organizationId: string,
  vectorIds: string[]
): Promise<void> => {
  const uniqueVectorIds = Array.from(new Set(vectorIds.filter(Boolean)));
  if (uniqueVectorIds.length === 0) {
    return;
  }

  const namespace = getPineconeNamespace(organizationId);
  const batchSize = 200;

  for (let offset = 0; offset < uniqueVectorIds.length; offset += batchSize) {
    const ids = uniqueVectorIds.slice(offset, offset + batchSize);

    await callPineconeDataApi("/vectors/delete", {
      namespace,
      ids,
    });
  }
};

const queryKnowledgeVectors = async (
  organizationId: string,
  vector: number[],
  topK = 5
): Promise<KnowledgeVectorMatch[]> => {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new AppError("Query vector is required for Pinecone search", 400);
  }

  const namespace = getPineconeNamespace(organizationId);
  const host = await getPineconeIndexHost();

  const response = await fetch(`https://${host}/query`, {
    method: "POST",
    headers: buildPineconeHeaders(),
    body: JSON.stringify({
      namespace,
      vector,
      topK: Math.max(1, Math.min(topK, 20)),
      includeMetadata: true,
      includeValues: false,
    }),
  });

  if (!response.ok) {
    const message = await parsePineconeError(response, "Pinecone query request failed");
    throw new AppError(message, 502);
  }

  const body = (await response.json().catch(() => null)) as
    | { matches?: Array<{ id?: string; score?: number; metadata?: Record<string, unknown> }> }
    | null;

  if (!Array.isArray(body?.matches) || body.matches.length === 0) {
    return [];
  }

  return body.matches
    .filter((match) => typeof match?.id === "string")
    .map((match) => ({
      id: String(match.id),
      score: typeof match?.score === "number" ? match.score : 0,
      metadata: (match?.metadata ?? {}) as KnowledgeVectorMatch["metadata"],
    }));
};

export {
  getPineconeNamespace,
  upsertKnowledgeVectors,
  deleteKnowledgeVectors,
  queryKnowledgeVectors,
};

