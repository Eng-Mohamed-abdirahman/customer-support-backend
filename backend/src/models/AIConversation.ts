import mongoose from "mongoose";

const aiConversationSchema = new mongoose.Schema(
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
    channel: {
      type: String,
      trim: true,
      default: "whatsapp",
    },
    customerPhone: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    prompt: {
      type: String,
      trim: true,
      default: "",
    },
    reply: {
      type: String,
      trim: true,
      default: "",
    },
    modelName: {
      type: String,
      trim: true,
      default: "",
    },
    usage: {
      promptTokens: {
        type: Number,
        default: 0,
      },
      completionTokens: {
        type: Number,
        default: 0,
      },
      totalTokens: {
        type: Number,
        default: 0,
      },
    },
    externalMessageId: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

aiConversationSchema.index({ organizationId: 1, conversationId: 1 });

export default mongoose.model("AIConversation", aiConversationSchema);

