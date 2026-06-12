import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const optimizeSchema = z.object({
  rawIntention: z.string().min(3),
  referencePhotoUrl: z.string().url().optional(),
});

const generateSchema = z.object({
  designType: z.enum(["poster", "flyer", "brochure", "social_media_post", "banner"]),
  promptText: z.string().min(3),
  referenceImageUrl: z.string().url().optional(),
});

export function validateOptimize(req: Request, res: Response, next: NextFunction) {
  const parsed = optimizeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });
  next();
}

export function validateGenerate(req: Request, res: Response, next: NextFunction) {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors });
  next();
}
