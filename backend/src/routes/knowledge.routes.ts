import express from "express";

import { protect } from "../middlewares/auth.middleware";
import { uploadKnowledgeDocument as uploadKnowledgeDocumentMiddleware } from "../middlewares/upload.middleware";
import { uploadLimiter } from "../middlewares/rateLimit.middleware";
import { uploadKnowledgeDocument, listKnowledgeDocuments, getKnowledgeDocument, deleteKnowledgeDocument } from "../controllers/knowledge.controller";
import { getKnowledgeInsightsController } from "../controllers/knowledge-insights.controller";

const router = express.Router();

router.post(
  "/upload",
  protect,
  uploadLimiter,
  uploadKnowledgeDocumentMiddleware,
  uploadKnowledgeDocument
);
router.get("/documents", protect, listKnowledgeDocuments);
router.get("/documents/:id", protect, getKnowledgeDocument);
router.delete("/documents/:id", protect, deleteKnowledgeDocument);
router.get("/insights", protect, getKnowledgeInsightsController);

export default router;

