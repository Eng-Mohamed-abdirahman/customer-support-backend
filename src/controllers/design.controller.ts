import { Request, Response } from "express";
import DesignHistory from "../models/DesignHistory";
import { uploadStreamToBackblaze } from "../services/backblaze.service";
import { runPromptRefiner, runImageGeneration } from "../services/replicate.service";

const BrandIdentity = require("../models/BrandIdentity");
const { sendEvent } = require("../services/inngest.client");

export async function optimizePrompt(req: Request, res: Response) {
  const { rawIntention, referencePhotoUrl } = req.body;

  try {
    const systemPrompt = `You are an expert graphic design Prompt Engineer. Convert basic user ideas into robust, descriptive, and structurally sound visual design prompts. Describe colors, visual balance, and elements. Do not include conversational preambles or explanations; return ONLY the optimized text prompt.`;

    let userQuery = `Refine this concept: "${rawIntention}".`;
    if (referencePhotoUrl) {
      userQuery += ` Ensure the visual design style, mood, and layout draw details from: ${referencePhotoUrl}`;
    }

    const optimizedPrompt = await runPromptRefiner(systemPrompt, userQuery);
    return res.status(200).json({ success: true, optimizedPrompt });
  } catch (error) {
    console.error("Optimize Prompt Error:", error);
    return res.status(500).json({ success: false, message: "Failed to optimize prompt." });
  }
}


export async function generateDesign(req: Request, res: Response) {
  const { designType, promptText, referenceImageUrl } = req.body;
  const orgId = (req as any).user?.organizationId;

  try {
    const brand = await BrandIdentity.findOne({ organizationId: orgId });
    if (!brand) {
      return res.status(400).json({ success: false, message: "Configure brand settings first." });
    }

    const finalCompiledPrompt = `
      A professional corporate ${designType.toUpperCase()} marketing layout.
      BRAND GUIDELINES:
      - Brand Name: "${brand.brandName}"
      - Color Scheme: Main color ${brand.primaryColor}, secondary accent color ${brand.secondaryColor}.
      - Typography Theme: Apply aesthetics resembling "${brand.fontStyle}" styling.
      - Corporate logo placement: Incorporate design parameters from logo: "${brand.logoUrl}".

      SCENE DESCRIPTION:
      - ${promptText}
      - Modern design, high commercial viability, balanced grids, 8k resolution.
    `;

    // Create a pending DesignHistory entry and enqueue a background job
    const entry = await DesignHistory.create({
      organizationId: orgId,
      designType,
      promptText,
      referenceImageUrl,
      generatedImageUrl: "",
      brandSnapshot: {
        brandName: brand.brandName,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        fontStyle: brand.fontStyle,
        logoUrl: brand.logoUrl,
      },
      status: "pending",
    });

    // Send an Inngest event to process the design asynchronously
    const eventPayload = {
      designHistoryId: entry._id.toString(),
      designType,
      promptText: finalCompiledPrompt,
      referenceImageUrl,
      orgId,
    };

    await sendEvent("design.generate", eventPayload);

    return res.status(202).json({ success: true, designId: entry._id });
  } catch (error) {
    console.error("Design Generation Error:", error);
    return res.status(500).json({ success: false, message: "AI asset generation failed." });
  }
}

export async function regenerateDesign(req: Request, res: Response) {
  const { previousDesignId, useUpdatedBrand } = req.body;
  const orgId = (req as any).user?.organizationId;

  try {
    const previous = await DesignHistory.findById(previousDesignId);
    if (!previous) return res.status(404).json({ success: false, message: "Previous design not found." });

    const brand = useUpdatedBrand ? await BrandIdentity.findOne({ organizationId: orgId }) : previous.brandSnapshot;
    if (!brand) return res.status(400).json({ success: false, message: "Brand settings missing." });

    const finalCompiledPrompt = `
      A professional corporate ${previous.designType.toUpperCase()} marketing layout.
      BRAND GUIDELINES:
      - Brand Name: "${brand.brandName}"
      - Color Scheme: Main color ${brand.primaryColor}, secondary accent color ${brand.secondaryColor}.
      - Typography Theme: Apply aesthetics resembling "${brand.fontStyle}" styling.
      - Corporate logo placement: Incorporate design parameters from logo: "${brand.logoUrl}".

      SCENE DESCRIPTION:
      - ${previous.promptText}
      - Modern design, high commercial viability, balanced grids, 8k resolution.
    `;

    const model = "black-forest-labs/flux-schnell";
    const inputPayload: any = {
      prompt: finalCompiledPrompt,
      aspect_ratio: previous.designType === "poster" ? "3:4" : previous.designType === "flyer" ? "2:3" : "1:1",
      num_outputs: 1,
      output_format: "png",
    };

    if (previous.referenceImageUrl) {
      inputPayload.image = previous.referenceImageUrl;
      inputPayload.prompt_strength = 0.65;
    }

    const prediction = await runImageGeneration(model, inputPayload);
    const imageCdnUrl = Array.isArray(prediction) ? prediction[0] : prediction;

    const response = await fetch(imageCdnUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const targetFilename = `outputs/design_${orgId}_${Date.now()}.png`;
    const finalB2Url = await uploadStreamToBackblaze(buffer, targetFilename, "image/png");

    const result = await DesignHistory.create({
      organizationId: orgId,
      designType: previous.designType,
      promptText: previous.promptText,
      rawUserIntention: previous.rawUserIntention,
      referenceImageUrl: previous.referenceImageUrl,
      generatedImageUrl: finalB2Url,
      brandSnapshot: {
        brandName: brand.brandName,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        fontStyle: brand.fontStyle,
        logoUrl: brand.logoUrl,
      },
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Regenerate Error:", error);
    return res.status(500).json({ success: false, message: "Regeneration failed." });
  }
}

export async function replicateWebhook(req: Request, res: Response) {
  try {
    const payload = req.body;
    // Replicate webhook payloads vary by model; expect `prediction` object and meta.designHistoryId
    const prediction = payload.prediction || payload;
    const meta = prediction?.meta || payload?.meta || {};
    const designHistoryId = meta?.designHistoryId || payload?.designHistoryId || prediction?.id;

    if (!designHistoryId) {
      return res.status(400).json({ success: false, message: "Missing designHistoryId in webhook payload." });
    }

    if (prediction?.status === "succeeded" && Array.isArray(prediction?.output) && prediction.output.length) {
      const imageUrl = prediction.output[0];
      const response = await fetch(imageUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const targetFilename = `outputs/design_webhook_${designHistoryId}_${Date.now()}.png`;
      const finalB2Url = await uploadStreamToBackblaze(buffer, targetFilename, "image/png");
      await DesignHistory.findByIdAndUpdate(designHistoryId, { generatedImageUrl: finalB2Url, status: "completed" });
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
