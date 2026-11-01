const mongoose = require("mongoose");

const BrandIdentitySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    brandName: {
      type: String,
      trim: true,
      default: "",
    },
    primaryColor: {
      type: String,
      trim: true,
      default: "",
    },
    secondaryColor: {
      type: String,
      trim: true,
      default: "",
    },
    fontStyle: {
      type: String,
      trim: true,
      default: "",
    },
    logoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    // Optional fields for future use
    brandDescription: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BrandIdentity", BrandIdentitySchema);

export {};
