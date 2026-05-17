const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      enum: ["customer", "assistant", "agent", "system"],
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "document", "audio"],
      default: "text",
      index: true,
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
    aiGenerated: {
      type: Boolean,
      default: false,
      index: true,
    },
    externalId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", messageSchema);

export {};
