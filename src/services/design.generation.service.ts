import {
  type BrandSnapshot,
  type DesignType,
  getAspectRatio,
  selectGenerationModel,
} from "../config/design.config";
import { buildGenerationPrompt, type ReferenceLayoutAnalysis } from "../prompts/design.prompts";
import { runImageGeneration, type ReplicateRunResult } from "./replicate.service";
import { resolveLogoDisplayUrl } from "../utils/logoUrl";
import { designLog } from "../utils/design.logger";

export type DesignGenerationInput = {
  designType: DesignType;
  promptText: string;
  referenceImageUrl?: string | null;
  brand: BrandSnapshot;
  layoutAnalysis?: ReferenceLayoutAnalysis | null;
  rawUserIntention?: string;
};

export type DesignGenerationResult = {
  imageUrl: string;
  model: string;
  usedReferenceImage: boolean;
  prompt: string;
  replicatePredictionId: string;
  replicateMetrics?: Record<string, unknown>;
  replicateDurationMs: number;
};

/**
 * Ensure the reference URL is fetchable by Replicate (signed if stored in private B2).
 */
export async function resolveReferenceImageUrl(url: string): Promise<string> {
  if (!url?.trim()) {
    return "";
  }

  const trimmed = url.trim();
  const resolved = await resolveLogoDisplayUrl(trimmed);
  return resolved || trimmed;
}

async function verifyReferenceAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (response.ok) {
      return true;
    }
    const getResponse = await fetch(url, { method: "GET" });
    return getResponse.ok;
  } catch {
    return false;
  }
}

/**
 * Build model-specific payload.
 * - With reference: Nano-Banana / FLUX (input_image + prompt) for layout-preserving redesign
 * - Without reference: Nano-Banana / FLUX text-to-image
 */
export function buildModelPayload(
  model: string,
  prompt: string,
  designType: DesignType,
  referenceImageUrl?: string
): Record<string, unknown> {
  const aspectRatio = getAspectRatio(designType);

  if (model.includes("kontext") || model.includes("nano-banana") || model.includes("google")) {
    const payload: Record<string, unknown> = {
      prompt,
      output_format: "png",
      aspect_ratio: aspectRatio,
      safety_tolerance: 2,
    };

    if (referenceImageUrl) {
      payload.input_image = referenceImageUrl;
      payload.image = referenceImageUrl;
    }

    return payload;
  }

  // Fallback text-to-image payload
  return {
    prompt,
    aspect_ratio: aspectRatio,
    num_outputs: 1,
    output_format: "png",
  };
}

/**
 * Generate a design with reference-guided or text-only pipeline.
 */
export async function generateReferenceGuidedDesign(
  input: DesignGenerationInput
): Promise<DesignGenerationResult> {
  const requestedReference = input.referenceImageUrl?.trim() ?? "";
  const accessibleReference = requestedReference
    ? await resolveReferenceImageUrl(requestedReference)
    : "";

  if (requestedReference && !accessibleReference) {
    throw new Error("Reference image URL could not be resolved for generation.");
  }

  const hasReference = Boolean(accessibleReference);

  if (requestedReference && hasReference) {
    const reachable = await verifyReferenceAccessible(accessibleReference);
    if (!reachable) {
      designLog.warn("generation.reference.unreachable", {
        referenceUrl: accessibleReference.slice(0, 120),
      });
    }
  }

  const model = selectGenerationModel(hasReference);

  const prompt = buildGenerationPrompt({
    designType: input.designType,
    userPrompt: input.promptText,
    brand: input.brand,
    layoutAnalysis: input.layoutAnalysis,
    hasReferenceImage: hasReference,
    rawUserIntention: input.rawUserIntention,
  });

  const payload = buildModelPayload(model, prompt, input.designType, accessibleReference || undefined);

  designLog.info("generation.dispatch", {
    model,
    hasReference,
    requestedReference: requestedReference ? requestedReference.slice(0, 80) : null,
    referenceUrl: accessibleReference ? accessibleReference.slice(0, 80) : null,
    promptPreview: prompt.slice(0, 200),
    userPromptChars: input.promptText.length,
  });

  const replicateResult: ReplicateRunResult = await runImageGeneration(model, payload);

  return {
    imageUrl: replicateResult.output,
    model,
    usedReferenceImage: hasReference,
    prompt,
    replicatePredictionId: replicateResult.predictionId,
    replicateMetrics: replicateResult.metrics,
    replicateDurationMs: replicateResult.durationMs,
  };
}
