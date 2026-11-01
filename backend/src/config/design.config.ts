export type DesignType =
  | "poster"
  | "flyer"
  | "brochure"
  | "social_media_post"
  | "banner";

export type BrandSnapshot = {
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  fontStyle: string;
  logoUrl: string;
};

/** Reference-guided editing — preserves layout/structure from input_image. */
export const KONTEXT_MODEL =
  process.env.REPLICATE_KONTEXT_MODEL || "google/nano-banana";

/** Premium reference-guided editing — stronger prompt adherence & typography. */
export const KONTEXT_MAX_MODEL =
  process.env.REPLICATE_KONTEXT_MAX_MODEL || "google/nano-banana";

/** Fast text-to-image fallback when no reference is provided. */
export const T2I_FALLBACK_MODEL =
  process.env.REPLICATE_T2I_MODEL || "google/nano-banana";

/** Vision model for layout/structure extraction from reference uploads. */
export const VISION_MODEL =
  process.env.REPLICATE_VISION_MODEL || "yorickvp/llava-13b";

export const DESIGN_VISION_ENABLED =
  process.env.DESIGN_VISION_ENABLED !== "false" &&
  Boolean(process.env.REPLICATE_API_TOKEN);

export const USE_KONTEXT_MAX =
  process.env.DESIGN_USE_KONTEXT_MAX === "true";

export const MAX_GENERATION_PROMPT_CHARS = 3200;

export function getAspectRatio(designType: DesignType): string {
  switch (designType) {
    case "poster":
      return "3:4";
    case "flyer":
      return "2:3";
    case "banner":
      return "16:9";
    case "social_media_post":
      return "1:1";
    case "brochure":
    default:
      return "4:3";
  }
}

export function selectGenerationModel(hasReference: boolean): string {
  if (!hasReference) {
    return T2I_FALLBACK_MODEL;
  }
  // kontext-max follows edit instructions and typography more reliably; set DESIGN_USE_KONTEXT_PRO=true for pro
  const usePro = process.env.DESIGN_USE_KONTEXT_PRO === "true";
  return usePro ? KONTEXT_MODEL : KONTEXT_MAX_MODEL;
}
