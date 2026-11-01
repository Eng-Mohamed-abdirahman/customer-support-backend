import crypto from "crypto";
import DesignHistory from "../models/DesignHistory";
import type { BrandSnapshot, DesignType } from "../config/design.config";
import { analyzeReferenceDesign } from "./design.vision.service";
import {
  generateReferenceGuidedDesign,
  resolveReferenceImageUrl,
} from "./design.generation.service";
import { uploadFile } from "./storage.service";
import {
  buildOptimizerSystemPrompt,
  buildOptimizerUserQuery,
  sanitizeOptimizedPrompt,
  type ReferenceLayoutAnalysis,
} from "../prompts/design.prompts";
import { runPromptRefiner } from "./replicate.service";
import { designLog } from "../utils/design.logger";

const md5 = (buffer: Buffer) => crypto.createHash("md5").update(buffer).digest("hex");

export type OptimizePromptInput = {
  rawIntention: string;
  designType?: DesignType;
  referencePhotoUrl?: string;
  brand: BrandSnapshot;
};

export type OptimizePromptOutput = {
  optimizedPrompt: string;
  layoutAnalysis: ReferenceLayoutAnalysis | null;
};

export async function optimizeDesignPrompt(
  input: OptimizePromptInput
): Promise<OptimizePromptOutput> {
  designLog.info("optimize.start", {
    designType: input.designType,
    hasReference: Boolean(input.referencePhotoUrl),
    brand: input.brand.brandName,
  });

  let layoutAnalysis: ReferenceLayoutAnalysis | null = null;
  const hasReference = Boolean(input.referencePhotoUrl?.trim());

  if (hasReference) {
    const accessibleUrl = await resolveReferenceImageUrl(input.referencePhotoUrl!);
    layoutAnalysis = await analyzeReferenceDesign(accessibleUrl);
    designLog.info("optimize.vision.done", { hasLayoutAnalysis: Boolean(layoutAnalysis) });
  }

  const systemPrompt = buildOptimizerSystemPrompt(input.brand, hasReference);
  const userQuery = buildOptimizerUserQuery({
    rawIntention: input.rawIntention,
    designType: input.designType,
    hasReferenceImage: hasReference,
    layoutAnalysis,
  });

  const rawOptimized = await runPromptRefiner(systemPrompt, userQuery);
  const optimizedPrompt = sanitizeOptimizedPrompt(rawOptimized);

  designLog.info("optimize.complete", {
    rawChars: rawOptimized.length,
    sanitizedChars: optimizedPrompt.length,
  });

  return { optimizedPrompt, layoutAnalysis };
}

export type ProcessDesignJobInput = {
  designHistoryId: string;
  designType: DesignType;
  promptText: string;
  referenceImageUrl?: string | null;
  orgId: string;
  brand: BrandSnapshot;
  layoutAnalysis?: ReferenceLayoutAnalysis | null;
  rawUserIntention?: string;
};

export async function processDesignGenerationJob(input: ProcessDesignJobInput) {
  const { designHistoryId, orgId } = input;

  designLog.info("job.start", {
    designHistoryId,
    orgId,
    designType: input.designType,
    hasReference: Boolean(input.referenceImageUrl),
    brand: input.brand.brandName,
  });

  await DesignHistory.findByIdAndUpdate(designHistoryId, { status: "processing" });

  if (input.layoutAnalysis && !input.referenceImageUrl?.trim()) {
    throw new Error("Reference image is required when layout analysis is provided.");
  }

  let layoutAnalysis = input.layoutAnalysis ?? null;
  let referenceHash: string | null = null;

  if (input.referenceImageUrl) {
    const accessibleUrl = await resolveReferenceImageUrl(input.referenceImageUrl);
    try {
      const refResp = await fetch(accessibleUrl);
      if (refResp.ok) {
        const refBuffer = Buffer.from(await refResp.arrayBuffer());
        referenceHash = md5(refBuffer);
        designLog.info("job.reference.loaded", {
          bytes: refBuffer.length,
          md5: referenceHash,
        });
      }
    } catch (error) {
      designLog.warn("job.reference.fetch_failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (!layoutAnalysis) {
      layoutAnalysis = await analyzeReferenceDesign(accessibleUrl);
    }
  }

  const generation = await generateReferenceGuidedDesign({
    designType: input.designType,
    promptText: input.promptText,
    referenceImageUrl: input.referenceImageUrl,
    brand: input.brand,
    layoutAnalysis,
    rawUserIntention: input.rawUserIntention,
  });

  designLog.info("job.replicate.done", {
    predictionId: generation.replicatePredictionId,
    durationMs: generation.replicateDurationMs,
    metrics: generation.replicateMetrics ?? null,
    outputUrl: generation.imageUrl.slice(0, 120),
  });

  const resp = await fetch(generation.imageUrl);
  if (!resp.ok) {
    throw new Error(`Failed to download generated image (${resp.status})`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  const generatedHash = md5(buffer);

  designLog.info("job.download.done", {
    bytes: buffer.length,
    md5: generatedHash,
    sameAsReference: referenceHash ? generatedHash === referenceHash : false,
  });

  if (referenceHash && generatedHash === referenceHash) {
    designLog.warn("job.output.identical_to_reference", {
      designHistoryId,
      predictionId: generation.replicatePredictionId,
    });
  }

  const uploadResult = await uploadFile(buffer, `outputs/${orgId}`, "image/png");

  designLog.info("job.upload.done", {
    publicUrl: uploadResult.publicUrl,
    designHistoryId,
  });

  await DesignHistory.findByIdAndUpdate(designHistoryId, {
    generatedImageUrl: uploadResult.publicUrl,
    status: "completed",
    generationModel: generation.model,
    usedReferenceImage: generation.usedReferenceImage,
    layoutAnalysis: layoutAnalysis ?? undefined,
    compiledPrompt: generation.prompt,
    replicatePredictionId: generation.replicatePredictionId,
    replicateMetrics: generation.replicateMetrics ?? undefined,
  });

  designLog.info("job.complete", {
    designHistoryId,
    predictionId: generation.replicatePredictionId,
    replicateDurationMs: generation.replicateDurationMs,
  });

  return {
    finalUrl: uploadResult.publicUrl,
    model: generation.model,
    usedReferenceImage: generation.usedReferenceImage,
    replicatePredictionId: generation.replicatePredictionId,
  };
}
