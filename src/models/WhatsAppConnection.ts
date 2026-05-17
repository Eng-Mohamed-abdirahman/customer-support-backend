const mongoose = require("mongoose");

const whatsappConnectionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
      index: true,
    },
    phoneNumberId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    businessAccountId: {
      type: String,
      required: true,
      trim: true,
    },
    accessTokenEncrypted: {
      type: String,
      select: false,
    },
    accessTokenIv: {
      type: String,
      select: false,
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
