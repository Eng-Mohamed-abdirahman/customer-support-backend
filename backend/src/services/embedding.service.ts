import { InferenceClient, PROVIDERS_OR_POLICIES } from "@huggingface/inference";

import { env } from "../config/env";
import { AppError } from "../utils/appError";

type InferenceProviderOrPolicy = (typeof PROVIDERS_OR_POLICIES)[number];

const resolveProvider = (value: string): InferenceProviderOrPolicy =>
  (PROVIDERS_OR_POLICIES as readonly string[]).includes(value)
    ? (value as InferenceProviderOrPolicy)
    : "hf-inference";

const EMBEDDING_MODEL = env.HF_EMBEDDING_MODEL || "google/embeddinggemma-300m";

let huggingFaceClient: InferenceClient | null = null;

const getHuggingFaceClient = () => {
  if (!env.HF_TOKEN) {
    throw new AppError("HF_TOKEN is not configured", 500);
  }

  if (!huggingFaceClient) {
    huggingFaceClient = new InferenceClient(env.HF_TOKEN);
  }

  return huggingFaceClient;
};

const isNumberArray = (value: unknown): value is number[] => {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
};

const isNumberMatrix = (value: unknown): value is number[][] => {
  return Array.isArray(value) && value.every(isNumberArray);
};

const meanPoolMatrix = (matrix: number[][]): number[] => {
  if (matrix.length === 0) {
    throw new AppError("Embedding provider returned an empty token matrix", 502);
  }

  const dimensions = matrix[0].length;
  if (dimensions === 0) {
    throw new AppError("Embedding provider returned an empty vector", 502);
  }

  const pooled = new Array(dimensions).fill(0);

  for (const row of matrix) {
    if (row.length !== dimensions) {
      throw new AppError("Embedding provider returned inconsistent vector dimensions", 502);
    }

    row.forEach((value, index) => {
      pooled[index] += value;
    });
  }

  return pooled.map((value) => value / matrix.length);
};

const normalizeEmbeddingVector = (value: unknown): number[] => {
  if (isNumberArray(value)) {
    return value;
  }

  if (isNumberMatrix(value)) {
    return meanPoolMatrix(value);
  }

  throw new AppError("Unexpected embedding shape from Hugging Face", 502);
};

const normalizeEmbeddingOutput = (output: unknown, expectedCount: number): number[][] => {
  if (expectedCount === 1) {
    return [normalizeEmbeddingVector(output)];
  }

  if (!Array.isArray(output) || output.length !== expectedCount) {
    throw new AppError("Unexpected embedding response from Hugging Face", 502);
  }

  return output.map(normalizeEmbeddingVector);
};

const generateEmbeddings = async (texts: string[]): Promise<number[][]> => {
  const sanitizedTexts = texts.map((value) => value.trim()).filter(Boolean);

  if (sanitizedTexts.length === 0) {
    throw new AppError("No text provided for embedding generation", 400);
  }

  const client = getHuggingFaceClient();
  const response = await client.featureExtraction({
    model: EMBEDDING_MODEL,
    inputs: sanitizedTexts.length === 1 ? sanitizedTexts[0] : sanitizedTexts,
    provider: resolveProvider(env.HF_PROVIDER),
  });

  const embeddings = normalizeEmbeddingOutput(response, sanitizedTexts.length);
  const dimensions = embeddings[0]?.length ?? 0;

  if (dimensions === 0) {
    throw new AppError("Embedding provider returned an empty vector", 502);
  }

  const hasMismatchedDimensions = embeddings.some((embedding) => embedding.length !== dimensions);
  if (hasMismatchedDimensions) {
    throw new AppError("Embedding provider returned mismatched vector dimensions", 502);
  }

  return embeddings;
};

export {
  generateEmbeddings,
  EMBEDDING_MODEL,
};

