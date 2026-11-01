import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    monthlyPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    yearlyPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    maxWebsites: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    maxWhatsappNumbers: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    maxTeamMembers: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    maxConversations: {
      type: Number,
      required: true,
      min: 0,
      default: 1000,
    },
    knowledgeStorageGb: {
      type: Number,
      required: true,
      min: 0.1,
      default: 1,
    },
    analyticsEnabled: {
      type: Boolean,
      default: false,
    },
    knowledgeAiEnabled: {
      type: Boolean,
      default: true,
    },
    conversationSummaryEnabled: {
      type: Boolean,
      default: false,
    },
    faqInsightsEnabled: {
      type: Boolean,
      default: false,
    },
    sentimentAnalysisEnabled: {
      type: Boolean,
      default: false,
    },
    prioritySupport: {
      type: Boolean,
      default: false,
    },
    advancedSecurity: {
      type: Boolean,
      default: false,
    },
    whiteLabel: {
      type: Boolean,
      default: false,
    },
    customBranding: {
      type: Boolean,
      default: false,
    },
    apiAccess: {
      type: Boolean,
      default: false,
    },
    dedicatedManager: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      index: true,
    },
    duplicatedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "subscription_plans",
  }
);

export default mongoose.model("SubscriptionPlan", subscriptionPlanSchema);

