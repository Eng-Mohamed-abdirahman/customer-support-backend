import { VISION_ANALYSIS_PROMPT } from "../prompts/design.prompts";
import type { ReferenceLayoutAnalysis } from "../prompts/design.prompts";
import { DESIGN_VISION_ENABLED, VISION_MODEL } from "../config/design.config";
import { runVisionAnalysis } from "./replicate.service";

const EMPTY_ANALYSIS: ReferenceLayoutAnalysis = {
  layoutStructure: "Standard marketing layout with header, hero, content body, and footer zones.",
  visualHierarchy: "Title dominant, supporting subhead, body copy, CTA emphasis.",
  ctaPlacement: "Lower third or bottom-right emphasis zone.",
  contentBlocks: "Stacked informational sections with balanced spacing.",
  imagePlacement: "Hero visual upper or center-left with supporting icons.",
  colorDistribution: "Brand-dominant header/accents with neutral content background.",
  typographyHierarchy: "Bold headline, medium subhead, regular body text.",
  decorativeElements: "Minimal geometric accents and dividers.",
  rawAnalysis: "",
};

function parseVisionJson(raw: string): Partial<ReferenceLayoutAnalysis> | null {
  const trimmed = raw.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    return null;
  }

  try {
    return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as Partial<ReferenceLayoutAnalysis>;
  } catch {
    return null;
  }
}

function normalizeAnalysis(
  parsed: Partial<ReferenceLayoutAnalysis> | null,
  raw: string
): ReferenceLayoutAnalysis {
  if (!parsed) {
    return {
      ...EMPTY_ANALYSIS,
      rawAnalysis: raw,
      layoutStructure: raw.slice(0, 400) || EMPTY_ANALYSIS.layoutStructure,
    };
  }

  return {
    layoutStructure: parsed.layoutStructure || EMPTY_ANALYSIS.layoutStructure,
    visualHierarchy: parsed.visualHierarchy || EMPTY_ANALYSIS.visualHierarchy,
    ctaPlacement: parsed.ctaPlacement || EMPTY_ANALYSIS.ctaPlacement,
    contentBlocks: parsed.contentBlocks || EMPTY_ANALYSIS.contentBlocks,
    imagePlacement: parsed.imagePlacement || EMPTY_ANALYSIS.imagePlacement,
    colorDistribution: parsed.colorDistribution || EMPTY_ANALYSIS.colorDistribution,
    typographyHierarchy: parsed.typographyHierarchy || EMPTY_ANALYSIS.typographyHierarchy,
    decorativeElements: parsed.decorativeElements || EMPTY_ANALYSIS.decorativeElements,
    rawAnalysis: raw,
  };
}

/**
 * Extract layout/structure metadata from a reference design using a vision model.
 * Falls back to generic preservation hints if vision is disabled or fails.
 */
export async function analyzeReferenceDesign(
  referenceImageUrl: string
): Promise<ReferenceLayoutAnalysis | null> {
  if (!DESIGN_VISION_ENABLED || !referenceImageUrl) {
    return null;
  }

  try {
    const visionResult = await runVisionAnalysis(VISION_MODEL, referenceImageUrl, VISION_ANALYSIS_PROMPT);
    const raw = visionResult.output;
    return normalizeAnalysis(parseVisionJson(raw), raw);
  } catch (error) {
    console.warn("Reference vision analysis failed, continuing without structured layout:", error);
    return null;
  }
}
