const mongoose = require("mongoose");

const whatsappConnectionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    wabaId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    businessName: {
      type: String,
      trim: true,
      default: "",
    },
    phoneNumberId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    displayPhoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    accessTokenEncrypted: {
      type: String,
      select: false,
    },
    accessTokenIv: {
      type: String,
      select: false,
    },
    accessTokenExpiresAt: {
      type: Date,
      default: null,
    },
    verifyTokenEncrypted: {
      type: String,
      select: false,
    },
    verifyTokenIv: {
      type: String,
      select: false,
    },
    verifyTokenHash: {
      type: String,
      select: false,
      index: true,
    },
    webhookSubscriptionStatus: {
      type: String,
      enum: ["subscribed", "pending", "failed", "unknown"],
      default: "unknown",
      index: true,
    },
    webhookSubscribedAt: {
      type: Date,
      default: null,
    },
    lastWebhookError: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["connected", "disconnected", "pending", "error"],
      default: "connected",
      index: true,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    disconnectedAt: {
      type: Date,
      default: null,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WhatsAppConnection", whatsappConnectionSchema);

export {};
