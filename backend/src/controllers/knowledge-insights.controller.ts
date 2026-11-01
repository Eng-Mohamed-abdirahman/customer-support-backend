import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { getKnowledgeInsights } from "../services/knowledge-insights.service";

/**
 * GET /api/knowledge/insights?range=7d
 *
 * Returns AI-generated knowledge insights for the authenticated organization.
 * Requires: protect middleware (req.user.company = organizationId)
 */
export async function getKnowledgeInsightsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;

    if (!user || !user.company) {
      res.status(401).json({ success: false, message: "Not authorized" });
      return;
    }

    const organizationId = new mongoose.Types.ObjectId(String(user.company));

    const range =
      typeof req.query.range === "string" ? req.query.range : "7d";

    const result = await getKnowledgeInsights(organizationId, range);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}


