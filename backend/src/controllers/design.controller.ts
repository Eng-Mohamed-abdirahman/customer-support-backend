import { Request, Response } from "express";
import DesignHistory from "../models/DesignHistory";
import { uploadFile } from "../services/storage.service";
import { optimizeDesignPrompt } from "../services/design.pipeline.service";
import { generateReferenceGuidedDesign } from "../services/design.generation.service";
import type { BrandSnapshot, DesignType } from "../config/design.config";

import BrandIdentity from "../models/BrandIdentity";
import { queueDesignJob } from "../services/inngest.client";
import { resolveLogoDisplayUrl } from "../utils/logoUrl";

const toBrandSnapshot = (brand: any): BrandSnapshot => ({
  brandName: String(brand?.brandName ?? ""),
  primaryColor: String(brand?.primaryColor ?? "#000000"),
  secondaryColor: String(brand?.secondaryColor ?? "#0058be"),
  fontStyle: String(brand?.fontStyle ?? "Inter"),
  logoUrl: String(brand?.logoUrl ?? ""),
});

const loadBrandForOrg = async (orgId: string) => {
  const brand = await BrandIdentity.findOne({ organizationId: orgId }).lean();
  if (!brand) {
    return null;
  }
  return toBrandSnapshot(brand);
};

const serializeDesignRecord = async (design: any) => {
  const [generatedImageUrl, referenceImageUrl] = await Promise.all([
    resolveLogoDisplayUrl(design.generatedImageUrl ?? ""),
    resolveLogoDisplayUrl(design.referenceImageUrl ?? ""),
  ]);

  return {
    _id: String(design._id),
    organizationId: String(design.organizationId),
    designType: design.designType,
    promptText: design.promptText,
    rawUserIntention: design.rawUserIntention ?? "",
    referenceImageUrl,
    generatedImageUrl,
    generationModel: design.generationModel ?? null,
    replicatePredictionId: design.replicatePredictionId ?? null,
    replicateMetrics: design.replicateMetrics ?? null,
    usedReferenceImage: Boolean(design.usedReferenceImage),
    compiledPrompt: design.compiledPrompt ?? "",
    layoutAnalysis: design.layoutAnalysis ?? null,
    status: design.status ?? "pending",
    brandSnapshot: design.brandSnapshot ?? null,
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
  };
};

export async function optimizePrompt(req: Request, res: Response) {
  const { rawIntention, referencePhotoUrl, designType } = req.body;
  const orgId = (req as any).organizationId;

  try {
    const brand = await loadBrandForOrg(orgId);
    if (!brand) {
      return res.status(400).json({ success: false, message: "Configure brand settings first." });
    }

    const result = await optimizeDesignPrompt({
      rawIntention,
      referencePhotoUrl,
      designType: designType as DesignType | undefined,
      brand,
    });

    return res.status(200).json({
      success: true,
      optimizedPrompt: result.optimizedPrompt,
      layoutAnalysis: result.layoutAnalysis,
    });
  } catch (error) {
    console.error("Optimize Prompt Error:", error);
    const message = error instanceof Error ? error.message : "Failed to optimize prompt.";
    return res.status(500).json({ success: false, message });
  }
}

export async function generateDesign(req: Request, res: Response) {
  const { designType, promptText, referenceImageUrl, layoutAnalysis, rawUserIntention } = req.body;
  const orgId = (req as any).organizationId;

  try {
    const brand = await loadBrandForOrg(orgId);
    if (!brand) {
      return res.status(400).json({ success: false, message: "Configure brand settings first." });
    }

    const normalizedReference = typeof referenceImageUrl === "string" ? referenceImageUrl.trim() : "";

    const entry = await DesignHistory.create({
      organizationId: orgId,
      designType,
      promptText,
      rawUserIntention: rawUserIntention ?? "",
      referenceImageUrl: normalizedReference || null,
      generatedImageUrl: "",
      layoutAnalysis: layoutAnalysis ?? null,
      brandSnapshot: brand,
      status: "pending",
    });

    const eventPayload = {
      designHistoryId: entry._id.toString(),
      designType,
      promptText,
      referenceImageUrl: normalizedReference || null,
      orgId,
      brand,
      layoutAnalysis: layoutAnalysis ?? null,
      rawUserIntention: rawUserIntention ?? "",
    };

    queueDesignJob(eventPayload);

    return res.status(202).json({
      success: true,
      designId: String(entry._id),
      status: "pending",
      generatedImageUrl: "",
    });
  } catch (error) {
    console.error("Design Generation Error:", error);
    const message = error instanceof Error ? error.message : "AI asset generation failed.";
    return res.status(500).json({ success: false, message });
  }
}

export async function regenerateDesign(req: Request, res: Response) {
  const { previousDesignId, useUpdatedBrand } = req.body;
  const orgId = (req as any).organizationId;

  try {
    const previous = await DesignHistory.findById(previousDesignId);
    if (!previous) {
      return res.status(404).json({ success: false, message: "Previous design not found." });
    }

    const brandDoc = useUpdatedBrand
      ? await BrandIdentity.findOne({ organizationId: orgId })
      : previous.brandSnapshot;

    if (!brandDoc) {
      return res.status(400).json({ success: false, message: "Brand settings missing." });
    }

    const brand = toBrandSnapshot(brandDoc);

    const generation = await generateReferenceGuidedDesign({
      designType: previous.designType as DesignType,
      promptText: previous.promptText,
      referenceImageUrl: previous.referenceImageUrl,
      brand,
      layoutAnalysis: (previous.layoutAnalysis as any) ?? null,
    });

    const response = await fetch(generation.imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download generated image (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const uploadResult = await uploadFile(buffer, `outputs/${orgId}`, "image/png");

    const result = await DesignHistory.create({
      organizationId: orgId,
      designType: previous.designType,
      promptText: previous.promptText,
      rawUserIntention: previous.rawUserIntention,
      referenceImageUrl: previous.referenceImageUrl,
      generatedImageUrl: uploadResult.publicUrl,
      generationModel: generation.model,
      usedReferenceImage: generation.usedReferenceImage,
      layoutAnalysis: previous.layoutAnalysis,
      compiledPrompt: generation.prompt,
      replicatePredictionId: generation.replicatePredictionId,
      replicateMetrics: generation.replicateMetrics,
      status: "completed",
      brandSnapshot: brand,
    });

    const generatedImageUrl = await resolveLogoDisplayUrl(result.generatedImageUrl ?? "");

    return res.status(201).json({
      success: true,
      data: {
        _id: String(result._id),
        organizationId: String(result.organizationId),
        designType: result.designType,
        promptText: result.promptText,
        referenceImageUrl: result.referenceImageUrl ?? "",
        generatedImageUrl,
        generationModel: result.generationModel,
        replicatePredictionId: result.replicatePredictionId ?? null,
        replicateMetrics: result.replicateMetrics ?? null,
        usedReferenceImage: result.usedReferenceImage,
        status: result.status ?? "completed",
        brandSnapshot: result.brandSnapshot ?? null,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    console.error("Regenerate Error:", error);
    const message = error instanceof Error ? error.message : "Regeneration failed.";
    return res.status(500).json({ success: false, message });
  }
}

export async function listDesignHistory(req: Request, res: Response) {
  const orgId = (req as any).organizationId;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const designType = typeof req.query.designType === "string" ? req.query.designType : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  try {
    const filter: Record<string, unknown> = { organizationId: orgId };
    if (status) {
      filter.status = status;
    }
    if (designType) {
      filter.designType = designType;
    }

    const [designs, total] = await Promise.all([
      DesignHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      DesignHistory.countDocuments(filter),
    ]);

    const serialized = await Promise.all(designs.map((design) => serializeDesignRecord(design)));

    return res.status(200).json({
      success: true,
      designs: serialized,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("List Design History Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load design history." });
  }
}

export async function getDesignById(req: Request, res: Response) {
  const orgId = (req as any).organizationId;
  const designId = String(req.params.designId ?? "").trim();

  if (!designId) {
    return res.status(400).json({ success: false, message: "Design id is required." });
  }

  try {
    const design = await DesignHistory.findOne({ _id: designId, organizationId: orgId }).lean();

    if (!design) {
      return res.status(404).json({ success: false, message: "Design not found." });
    }

    return res.status(200).json({
      success: true,
      ...(await serializeDesignRecord(design)),
    });
  } catch (error) {
    console.error("Get Design Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load design." });
  }
}

export async function replicateWebhook(req: Request, res: Response) {
  try {
    const payload = req.body;
    const prediction = payload.prediction || payload;
    const meta = prediction?.meta || payload?.meta || {};
    const designHistoryId = meta?.designHistoryId || payload?.designHistoryId || prediction?.id;

    if (!designHistoryId) {
      return res.status(400).json({ success: false, message: "Missing designHistoryId in webhook payload." });
    }

    if (prediction?.status === "succeeded" && Array.isArray(prediction?.output) && prediction.output.length) {
      const imageUrl = prediction.output[0];
      const design = await DesignHistory.findById(designHistoryId).select("organizationId").lean();
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const orgFolder = design?.organizationId ? String(design.organizationId) : "webhook";
      const uploadResult = await uploadFile(buffer, `outputs/${orgFolder}`, "image/png");
      await DesignHistory.findByIdAndUpdate(designHistoryId, {
        generatedImageUrl: uploadResult.publicUrl,
        status: "completed",
      });
      return res.status(200).json({ success: true });
    }

    if (prediction?.status === "failed") {
      await DesignHistory.findByIdAndUpdate(designHistoryId, { status: "failed" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Replicate webhook handler error", err);
    return res.status(500).json({ success: false });
  }
}
