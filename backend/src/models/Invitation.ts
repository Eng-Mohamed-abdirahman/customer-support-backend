const invitationMongoose = require("mongoose");

const invitationSchema = new invitationMongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["admin", "company-admin", "staff"],
      required: true,
      index: true,
    },
    // Stored from inviter context. Completion flow must use this value only.
    company: {
      type: invitationMongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },
    // Only store hashed token in DB to protect the raw invitation token.
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    invitedBy: {
      type: invitationMongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = invitationMongoose.model("Invitation", invitationSchema);