const mongoose = require("mongoose");

const knowledgeChunkSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KnowledgeDocument",
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    content: {
      type: String,
      required: true,
    },
    embeddingId: {
      type: String,
      required: true,
    },
    tokenCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

knowledgeChunkSchema.index({ organizationId: 1, documentId: 1 });
knowledgeChunkSchema.index({ embeddingId: 1 }, { unique: true });

module.exports = mongoose.model("KnowledgeChunk", knowledgeChunkSchema);

export {};
