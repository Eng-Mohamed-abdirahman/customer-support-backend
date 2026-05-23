const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const {
  uploadKnowledgeDocument: uploadKnowledgeDocumentMiddleware,
} = require("../middlewares/upload.middleware");
const { uploadLimiter } = require("../middlewares/rateLimit.middleware");
const {
  uploadKnowledgeDocument,
  listKnowledgeDocuments,
  getKnowledgeDocument,
  deleteKnowledgeDocument,
} = require("../controllers/knowledge.controller");

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

module.exports = router;

export {};
