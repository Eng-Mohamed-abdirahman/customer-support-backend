import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const optimizeSchema = z.object({
  rawIntention: z.string().min(3),
  referencePhotoUrl: z.string().url().optional(),
  designType: z.enum(["poster", "flyer", "brochure", "social_media_post", "banner"]).optional(),
});

const generateSchema = z.object({
  designType: z.enum(["poster", "flyer", "brochure", "social_media_post", "banner"]),
  promptText: z.string().min(3),
  rawUserIntention: z.string().optional(),
  referenceImageUrl: z.string().url().optional(),
  layoutAnalysis: z.record(z.string(), z.string()).nullable().optional(),
});

export function validateOptimize(req: Request, res: Response, next: NextFunction) {
  const parsed = optimizeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues });
  next();
}

export function validateGenerate(req: Request, res: Response, next: NextFunction) {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues });
  next();
}

const listHistorySchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  designType: z.enum(["poster", "flyer", "brochure", "social_media_post", "banner"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export function validateListHistory(req: Request, res: Response, next: NextFunction) {
  const parsed = listHistorySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues });
  next();
}
