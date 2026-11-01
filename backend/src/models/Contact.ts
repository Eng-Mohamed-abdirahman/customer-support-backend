import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      default: "",
      lowercase: true,
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      enum: ["manual", "whatsapp"],
      default: "manual",
    },
  },
  {
    timestamps: true,
  }
);

contactSchema.index({ organizationId: 1, phone: 1 }, { unique: true });

export default mongoose.model("Contact", contactSchema);

