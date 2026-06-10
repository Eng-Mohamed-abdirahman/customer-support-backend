const mongoose = require("mongoose");

const brandIdentitySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
      index: true,
    },
    brandName: {
      type: String,
      required: true,
      trim: true,
    },
    primaryColor: {
      type: String,
      required: true,
      trim: true,
      match: /^#[0-9A-Fa-f]{6}$/,
    },
    secondaryColor: {
      type: String,
      required: true,
      trim: true,
      match: /^#[0-9A-Fa-f]{6}$/,
    },
    fontStyle: {
      type: String,
      required: true,
      trim: true,
    },
    logoUrl: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

brandIdentitySchema.index({ organizationId: 1 }, { unique: true });

module.exports = mongoose.model("BrandIdentity", brandIdentitySchema);

export {};