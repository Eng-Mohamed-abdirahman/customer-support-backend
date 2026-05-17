const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      trim: true,
      default: "whatsapp",
      index: true,
    },
    customerPhone: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["open", "pending", "closed"],
      default: "open",
      index: true,
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    aiEnabled: {
      type: Boolean,
      default: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ organizationId: 1, channel: 1, customerPhone: 1 }, { unique: true });

module.exports = mongoose.model("Conversation", conversationSchema);

export {};
