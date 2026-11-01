const mongoose = require("mongoose");

const planAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "plan_created",
        "plan_updated",
        "plan_deleted",
        "plan_assigned",
        "plan_changed",
        "plan_removed",
        "plan_disabled",
        "plan_enabled",
        "plan_duplicated",
        "upgrade_requested",
      ],
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorEmail: {
      type: String,
      trim: true,
      default: "",
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      default: null,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    requestId: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "plan_audit_logs",
  }
);

module.exports = mongoose.model("PlanAuditLog", planAuditLogSchema);

export {};
