import mongoose from "mongoose";

const webhookLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    phoneNumberId: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    wabaId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    externalId: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      trim: true,
      default: "message",
    },
    status: {
      type: String,
      enum: ["received", "processed", "skipped", "failed"],
      default: "received",
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: "",
    },
    payload: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

webhookLogSchema.index({ externalId: 1, phoneNumberId: 1 }, { unique: true });

export default mongoose.model("WebhookLog", webhookLogSchema);

