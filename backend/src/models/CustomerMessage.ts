const mongoose = require("mongoose");

const customerMessageSchema = new mongoose.Schema(
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
    externalId: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "document", "audio"],
      default: "text",
    },
    contentText: {
      type: String,
      trim: true,
      default: "",
    },
    media: {
      id: {
        type: String,
        default: "",
      },
      url: {
        type: String,
        default: "",
      },
      mimeType: {
        type: String,
        default: "",
      },
      fileName: {
        type: String,
        default: "",
      },
      caption: {
        type: String,
        default: "",
      },
      sha256: {
        type: String,
        default: "",
      },
      fileSize: {
        type: Number,
        default: 0,
      },
    },
    rawPayload: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

customerMessageSchema.index({ externalId: 1, phoneNumberId: 1 }, { unique: true });

module.exports = mongoose.model("CustomerMessage", customerMessageSchema);

export {};
