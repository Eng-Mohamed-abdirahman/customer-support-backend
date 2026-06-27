import type { BrandSnapshot, DesignType } from "../config/design.config";
import { MAX_GENERATION_PROMPT_CHARS } from "../config/design.config";

export type ReferenceLayoutAnalysis = {
  layoutStructure: string;
  visualHierarchy: string;
  ctaPlacement: string;
  contentBlocks: string;
  imagePlacement: string;
  colorDistribution: string;
  typographyHierarchy: string;
  decorativeElements: string;
  rawAnalysis: string;
};

export function buildOptimizerSystemPrompt(brand: BrandSnapshot, hasReferenceImage: boolean): string {
  const brandBlock = `Brand Name: ${brand.brandName}
Primary Color: ${brand.primaryColor}
Secondary Color: ${brand.secondaryColor}
Typography Style: ${brand.fontStyle}
Logo URL: ${brand.logoUrl}`;

  if (hasReferenceImage) {
    return `You write SHORT edit prompts for image editing (google/nano-banana).

The user uploaded a reference poster. That image will be sent to the model as input_image.
Your job: convert the user's request into concise EDIT INSTRUCTIONS (60-120 words).

CRITICAL RULES:
* Return ONLY the edit instructions.
* Start with: "Keep the same layout, composition, typography blocks, and structure."
* Then list ONLY the specific changes (subject swap, logo, phone number, colors, text).
* MUST apply brand identity: replace reference colors with brand primary/secondary colors, replace old logo/brand name with the brand below.
* Copy phone numbers EXACTLY as the user wrote them — same digits, no reformatting, no dashes added, no digits dropped.
* Do NOT write a creative brief for a brand-new poster.
* Do NOT describe a new scene, gradient, or composition from scratch.
* Do NOT use markdown, headings, or bullet points.

BRAND IDENTITY (mandatory — must replace reference branding):
${brandBlock}

Output ONLY the edit prompt text.`;
  }

  return `You are an image generation prompt engineer.

Transform the user's request into one production-ready text-to-image prompt (150-250 words).

CRITICAL RULES:
* Return ONLY the final prompt.
* MUST use the brand identity colors, logo, and typography from BRAND DETAILS below.
* Copy phone numbers EXACTLY as the user wrote them.
* No markdown, headings, bullet points, or explanations.

BRAND IDENTITY (mandatory):
${brandBlock}

Output ONLY the prompt text.`;
}

export function buildOptimizerUserQuery(input: {
  rawIntention: string;
  designType?: DesignType;
  hasReferenceImage: boolean;
  layoutAnalysis?: ReferenceLayoutAnalysis | null;
}): string {
  const parts = [
    `Design type: ${input.designType ?? "poster"}`,
    `User request: "${input.rawIntention}"`,
  ];

  if (input.hasReferenceImage) {
    parts.push(
      "A reference poster image WILL be supplied as input_image.",
      "Write edit instructions that preserve ~90% of the reference layout.",
      "MUST replace reference brand colors/logo with the organization brand identity."
    );

    if (input.layoutAnalysis) {
      parts.push(
        "REFERENCE LAYOUT ANALYSIS (preserve):",
        `Layout: ${input.layoutAnalysis.layoutStructure}`,
        `Hierarchy: ${input.layoutAnalysis.visualHierarchy}`,
        `CTA: ${input.layoutAnalysis.ctaPlacement}`,
        `Content blocks: ${input.layoutAnalysis.contentBlocks}`,
        `Image placement: ${input.layoutAnalysis.imagePlacement}`,
        `Colors: ${input.layoutAnalysis.colorDistribution}`,
        `Typography: ${input.layoutAnalysis.typographyHierarchy}`,
        `Decorative: ${input.layoutAnalysis.decorativeElements}`
      );
    }
  } else {
    parts.push("No reference image. Write a self-contained text-to-image prompt for an original layout.");
  }

  return parts.join("\n");
}

/** Strip Llama preambles / markdown wrappers from optimizer output. */
export function sanitizeOptimizedPrompt(raw: string): string {
  let text = raw.trim();

  text = text.replace(/^here is the (final |generated )?image[- ]generation prompt:?\s*/i, "");
  text = text.replace(/^optimized prompt:?\s*/i, "");
  text = text.replace(/^```[\w]*\n?/g, "").replace(/\n?```$/g, "");
  text = text.replace(/^["'`]+|["'`]+$/g, "");

  return text.trim();
}

/** Pull long digit sequences (phone numbers) from user text — used to prevent reformatting. */
export function extractExactDigitValues(text: string, minLength = 8): string[] {
  if (!text?.trim()) {
    return [];
  }
  const matches = text.match(/\d[\d\s-]{6,}\d/g);
  if (!matches) {
    return [];
  }
  const normalized = matches.map((m) => m.replace(/\D/g, "")).filter((d) => d.length >= minLength);
  return [...new Set(normalized)];
}

function buildMandatoryBrandBlock(brand: BrandSnapshot): string {
  return `MANDATORY BRAND IDENTITY (replace ALL reference branding):
- Remove every old logo and old brand name from the reference.
- Brand name: "${brand.brandName}" only — no other company names in the design.
- Logo: use "${brand.brandName}" at the same position as the reference logo.
- Primary color: ${brand.primaryColor} — recolor dominant reference accents to this.
- Secondary color: ${brand.secondaryColor} — use for headings, buttons, and accent blocks.
- Typography: ${brand.fontStyle} for all text.
- Logo asset: ${brand.logoUrl}`;
}

export function buildGenerationPrompt(input: {
  designType: DesignType;
  userPrompt: string;
  brand: BrandSnapshot;
  layoutAnalysis?: ReferenceLayoutAnalysis | null;
  hasReferenceImage: boolean;
  rawUserIntention?: string;
}): string {
  const userPrompt = sanitizeOptimizedPrompt(input.userPrompt).trim();

  if (!userPrompt) {
    throw new Error("Prompt text is required for image generation.");
  }

  const exactPhones = extractExactDigitValues(input.rawUserIntention ?? userPrompt);
  const phoneDirective =
    exactPhones.length > 0
      ? `\nPhone number MUST be exactly: ${exactPhones[0]} (copy verbatim, do not reformat).`
      : "";

  const brandBlock = buildMandatoryBrandBlock(input.brand);

  if (input.hasReferenceImage) {
    const layoutAppendix = input.layoutAnalysis
      ? `

Preserve these layout zones from the reference:
- Layout: ${input.layoutAnalysis.layoutStructure}
- Hierarchy: ${input.layoutAnalysis.visualHierarchy}
- CTA: ${input.layoutAnalysis.ctaPlacement}
- Content blocks: ${input.layoutAnalysis.contentBlocks}
- Image zones: ${input.layoutAnalysis.imagePlacement}
- Colors: ${input.layoutAnalysis.colorDistribution}
- Typography: ${input.layoutAnalysis.typographyHierarchy}`
      : "";

    const prompt = `Edit the provided reference image (input_image). Keep the same layout, text blocks, typography positions, and overall composition (~90% unchanged).

${userPrompt}

${brandBlock}${phoneDirective}${layoutAppendix}`.trim();

    if (prompt.length <= MAX_GENERATION_PROMPT_CHARS) {
      return prompt;
    }
    return `${prompt.slice(0, MAX_GENERATION_PROMPT_CHARS - 3)}...`;
  }

  const prompt = `${userPrompt}

${brandBlock}${phoneDirective}`.trim();

  if (prompt.length <= MAX_GENERATION_PROMPT_CHARS) {
    return prompt;
  }

  return `${prompt.slice(0, MAX_GENERATION_PROMPT_CHARS - 3)}...`;
}

export const VISION_ANALYSIS_PROMPT = `Analyze this marketing design image as a structural blueprint for AI redesign.

Return ONLY valid JSON with these keys (concise but specific):
{
  "layoutStructure": "describe grid, columns, zones",
  "visualHierarchy": "headline, subhead, body order",
  "ctaPlacement": "where CTA/buttons sit",
  "contentBlocks": "services, features, info blocks",
  "imagePlacement": "hero photos, icons, illustrations",
  "colorDistribution": "dominant/secondary/accent zones",
  "typographyHierarchy": "title vs body treatment",
  "decorativeElements": "shapes, patterns, borders"
}`;
