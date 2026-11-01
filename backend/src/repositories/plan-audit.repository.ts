import mongoose from "mongoose";

import PlanAuditLog from "../models/PlanAuditLog";
import PlanAssignmentHistory from "../models/PlanAssignmentHistory";
import Organization from "../models/Organization";

export type AuditLogInput = {
  action: string;
  actorId: string;
  actorEmail?: string;
  planId?: string | null;
  organizationId?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string;
};

export async function createAuditLog(input: AuditLogInput) {
  return PlanAuditLog.create({
    action: input.action,
    actorId: input.actorId,
    actorEmail: input.actorEmail ?? "",
    planId: input.planId ?? null,
    organizationId: input.organizationId ?? null,
    metadata: input.metadata ?? {},
    requestId: input.requestId ?? "",
  });
}

export type AssignmentHistoryInput = {
  organizationId: string;
  planId?: string | null;
  previousPlanId?: string | null;
  action: "assigned" | "changed" | "removed";
  billingCycle?: "monthly" | "yearly";
  expiresAt?: Date | null;
  assignedBy: string;
  notes?: string;
};

export async function createAssignmentHistory(input: AssignmentHistoryInput) {
  return PlanAssignmentHistory.create({
    organizationId: input.organizationId,
    planId: input.planId ?? null,
    previousPlanId: input.previousPlanId ?? null,
    action: input.action,
    billingCycle: input.billingCycle ?? "monthly",
    expiresAt: input.expiresAt ?? null,
    assignedBy: input.assignedBy,
    notes: input.notes ?? "",
  });
}

export type PlanOrganizationsFilters = {
  planId: string;
  page?: number;
  limit?: number;
  search?: string;
  subscriptionStatus?: string;
};

export async function findOrganizationsByPlan(filters: PlanOrganizationsFilters) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {
    planId: new mongoose.Types.ObjectId(filters.planId),
  };

  if (filters.subscriptionStatus) {
    query["subscription.status"] = filters.subscriptionStatus;
  }

  if (filters.search) {
    query["profile.name"] = { $regex: filters.search, $options: "i" };
  }

  const [organizations, total] = await Promise.all([
    Organization.find(query)
      .select(
        "_id slug status profile planId subscription usage planLimits createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Organization.countDocuments(query),
  ]);

  return { organizations, total, page, limit };
}

export async function listAuditLogs(filters: {
  action?: string;
  planId?: string;
  organizationId?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;
  const query: Record<string, unknown> = {};

  if (filters.action) {
    query.action = filters.action;
  }

  if (filters.planId && mongoose.Types.ObjectId.isValid(filters.planId)) {
    query.planId = new mongoose.Types.ObjectId(filters.planId);
  }

  if (filters.organizationId && mongoose.Types.ObjectId.isValid(filters.organizationId)) {
    query.organizationId = new mongoose.Types.ObjectId(filters.organizationId);
  }

  const [logs, total] = await Promise.all([
    PlanAuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actorId", "firstName lastName email")
      .populate("planId", "name")
      .populate("organizationId", "profile.name")
      .lean(),
    PlanAuditLog.countDocuments(query),
  ]);

  return { logs, total, page, limit };
}

export async function listAssignmentHistory(organizationId: string, limit = 20) {
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    return [];
  }

  return PlanAssignmentHistory.find({ organizationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("planId", "name monthlyPrice yearlyPrice")
    .populate("previousPlanId", "name")
    .populate("assignedBy", "firstName lastName email")
    .lean();
}
