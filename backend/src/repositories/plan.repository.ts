import mongoose from "mongoose";

import SubscriptionPlan from "../models/SubscriptionPlan";
import Organization from "../models/Organization";

export type PlanListFilters = {
  status?: "active" | "disabled";
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "name" | "monthlyPrice" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
};

function buildPlanFilter(filters: PlanListFilters) {
  const query: Record<string, unknown> = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
    ];
  }

  return query;
}

export async function findPlans(filters: PlanListFilters) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = filters.sortBy ?? "createdAt";
  const sortOrder = filters.sortOrder === "asc" ? 1 : -1;
  const query = buildPlanFilter(filters);

  const [plans, total] = await Promise.all([
    SubscriptionPlan.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    SubscriptionPlan.countDocuments(query),
  ]);

  return { plans, total, page, limit };
}

export async function findPlanById(planId: string) {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return null;
  }

  return SubscriptionPlan.findById(planId).lean();
}

export async function findPlanByName(name: string, excludeId?: string) {
  const query: Record<string, unknown> = {
    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  };

  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }

  return SubscriptionPlan.findOne(query).lean();
}

export async function createPlan(data: Record<string, unknown>) {
  return SubscriptionPlan.create(data);
}

export async function updatePlanById(planId: string, data: Record<string, unknown>) {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return null;
  }

  return SubscriptionPlan.findByIdAndUpdate(planId, data, {
    new: true,
    runValidators: true,
  }).lean();
}

export async function deletePlanById(planId: string) {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return null;
  }

  return SubscriptionPlan.findByIdAndDelete(planId).lean();
}

export async function countOrganizationsOnPlan(planId: string) {

  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return 0;
  }

  return Organization.countDocuments({ planId: new mongoose.Types.ObjectId(planId) });
}

export async function countAllPlans() {
  return SubscriptionPlan.countDocuments();
}

export async function countPlansByStatus(status: "active" | "disabled") {
  return SubscriptionPlan.countDocuments({ status });
}
