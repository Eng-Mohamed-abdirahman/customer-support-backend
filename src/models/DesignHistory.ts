import mongoose from "mongoose";

const DesignHistorySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    designType: {
      type: String,
      required: true,
      enum: ["poster", "flyer", "brochure", "social_media_post", "banner"],
    },
    promptText: {
      type: String,
      required: true,
    },
    rawUserIntention: {
      type: String,
      default: "",
    },
    referenceImageUrl: {
      type: String,
      default: null,
    },
    generatedImageUrl: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    replicatePredictionId: {
      type: String,
      default: null,
    },
    generationModel: {
      type: String,
      default: null,
    },
    usedReferenceImage: {
      type: Boolean,
      default: false,
    },
    layoutAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    compiledPrompt: {
      type: String,
      default: "",
    },
    replicateMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    brandSnapshot: {
      brandName: String,
      primaryColor: String,
      secondaryColor: String,
      fontStyle: String,
      logoUrl: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("DesignHistory", DesignHistorySchema);
