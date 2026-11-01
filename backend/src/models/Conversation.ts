import mongoose from "mongoose";

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
      alias: "assignedAgentId",
    },
    aiEnabled: {
      type: Boolean,
      default: true,
    },
    responderType: {
      type: String,
      enum: ["ai", "agent"],
      default: "ai",
      index: true,
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

conversationSchema.pre("save", function (this: any) {
  if (this.isModified("aiEnabled")) {
    this.responderType = this.aiEnabled ? "ai" : "agent";
  } else if (this.isModified("responderType")) {
    this.aiEnabled = this.responderType === "ai";
  }
});

conversationSchema.index({ organizationId: 1, channel: 1, customerPhone: 1 }, { unique: true });

export default mongoose.model("Conversation", conversationSchema);

