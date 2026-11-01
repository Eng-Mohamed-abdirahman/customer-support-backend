import Replicate from "replicate";
import { designLog, maskSecret } from "../utils/design.logger";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
  useFileOutput: false,
});

export type ReplicateRunResult = {
  output: string;
  predictionId: string;
  status: string;
  metrics?: Record<string, unknown>;
  durationMs: number;
  model: string;
};

function ensureReplicateToken(): void {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN is not configured in .env");
  }
}

const resolveOutputUrl = (value: unknown): string => {
  if (!value) {
    throw new Error("Replicate returned empty output");
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    const candidate = value as { url?: unknown; href?: string; toString?: () => string };
    if (typeof candidate.url === "string") {
      return candidate.url;
    }
    if (typeof candidate.href === "string") {
      return candidate.href;
    }
    const asString = candidate.toString?.();
    if (typeof asString === "string") {
      const urlMatch = asString.match(/https?:\/\/[^\s'")]+/);
      if (urlMatch) {
        return urlMatch[0];
      }
    }
  }

  throw new Error(`Unable to resolve image URL from Replicate output: ${JSON.stringify(value)}`);
};

/** Llama and similar models return token chunks; image models return a single URL string. */
const resolvePredictionOutput = (value: unknown): string => {
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        try {
          return resolveOutputUrl(item);
        } catch {
          return String(item ?? "");
        }
      })
      .join("")
      .trim();

    if (joined) {
      return joined;
    }

    throw new Error("Replicate returned empty output");
  }

  return resolveOutputUrl(value);
};

async function runPrediction(
  model: string,
  input: Record<string, unknown>,
  label: string
): Promise<ReplicateRunResult> {
  ensureReplicateToken();
  const startedAt = Date.now();

  designLog.info(`${label}.start`, {
    model,
    token: maskSecret(process.env.REPLICATE_API_TOKEN),
    inputKeys: Object.keys(input),
    hasInputImage: Boolean(input.input_image),
    hasImage: Boolean(input.image),
    promptChars: typeof input.prompt === "string" ? input.prompt.length : 0,
  });

  const prediction = await replicate.predictions.create({
    model: model as `${string}/${string}`,
    input,
  });

  designLog.info(`${label}.created`, {
    predictionId: prediction.id,
    status: prediction.status,
    model,
  });

  const completed = await replicate.wait(prediction);
  const durationMs = Date.now() - startedAt;

  designLog.info(`${label}.complete`, {
    predictionId: completed.id,
    status: completed.status,
    durationMs,
    metrics: completed.metrics ?? null,
    error: completed.error ?? null,
  });

  if (completed.status === "failed" || completed.status === "canceled") {
    throw new Error(
      `Replicate ${label} failed (${completed.status}): ${completed.error ?? "unknown error"}`
    );
  }

  const output = resolvePredictionOutput(completed.output);

  designLog.info(`${label}.output`, {
    predictionId: completed.id,
    outputUrl: output.slice(0, 120),
  });

  return {
    output,
    predictionId: String(completed.id),
    status: String(completed.status),
    metrics: (completed.metrics as Record<string, unknown> | undefined) ?? undefined,
    durationMs,
    model,
  };
}

export async function runPromptRefiner(systemPrompt: string, userQuery: string): Promise<string> {
  const model = "meta/meta-llama-3-8b-instruct";
  const result = await runPrediction(
    model,
    {
      prompt: userQuery,
      system_prompt: systemPrompt,
      max_tokens: 350,
      temperature: 0.5,
    },
    "replicate.prompt"
  );

  const optimized = result.output.trim();
  designLog.info("replicate.prompt.result", {
    predictionId: result.predictionId,
    outputChars: optimized.length,
    durationMs: result.durationMs,
  });

  return optimized;
}

export async function runImageGeneration(
  model: string,
  inputPayload: Record<string, unknown>
): Promise<ReplicateRunResult> {
  return runPrediction(model, inputPayload, "replicate.image");
}

export async function runVisionAnalysis(
  model: string,
  imageUrl: string,
  analysisPrompt: string
): Promise<ReplicateRunResult> {
  return runPrediction(
    model,
    {
      image: imageUrl,
      prompt: analysisPrompt,
    },
    "replicate.vision"
  );
}
