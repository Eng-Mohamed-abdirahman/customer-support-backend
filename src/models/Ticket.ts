const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: "",
    },
    customerPhone: {
      type: String,
      trim: true,
      default: "",
    },
    title: {
      type: String,
      trim: true,
      required: true,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      required: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["open", "pending", "closed"],
      default: "open",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

ticketSchema.index({ organizationId: 1, conversationId: 1, status: 1 });

module.exports = mongoose.model("Ticket", ticketSchema);

export {};
