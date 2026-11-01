import mongoose from "mongoose";
import * as planRepository from "../repositories/plan.repository";

import Organization from "../models/Organization";
import SubscriptionPlan from "../models/SubscriptionPlan";
import User from "../models/User";
import KnowledgeDocument from "../models/KnowledgeDocument";
import Conversation from "../models/Conversation";

export async function getPlanDashboardStats() {
  const [
    totalPlans,
    activePlans,
    activeOrganizations,
    organizationsWithPlans,
    planPopularity,
    enterprisePlans,
  ] = await Promise.all([
    planRepository.countAllPlans(),
    planRepository.countPlansByStatus("active"),
    Organization.countDocuments({ "subscription.status": "active" }),
    Organization.find({ planId: { $ne: null } })
      .select("planId subscription.billingCycle")
      .populate("planId", "monthlyPrice yearlyPrice dedicatedManager whiteLabel name")
      .lean(),
    Organization.aggregate([
      { $match: { planId: { $ne: null } } },
      { $group: { _id: "$planId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
    SubscriptionPlan.find({
      $or: [{ dedicatedManager: true }, { whiteLabel: true }],
    })
      .select("_id")
      .lean(),
  ]);

  let monthlyRevenue = 0;
  let enterpriseCustomers = 0;
  const enterprisePlanIds = new Set(
    enterprisePlans.map((plan: any) => String(plan._id))
  );

  for (const organization of organizationsWithPlans) {
    // planId is populated with the plan's prices above.
    const plan = organization.planId as unknown as { _id: unknown; monthlyPrice?: number; yearlyPrice?: number } | null;

    if (!plan || typeof plan !== "object") {
      continue;
    }

    const billingCycle = organization?.subscription?.billingCycle ?? "monthly";

    if (billingCycle === "yearly") {
      monthlyRevenue += (plan.yearlyPrice ?? 0) / 12;
    } else {
      monthlyRevenue += plan.monthlyPrice ?? 0;
    }

    if (enterprisePlanIds.has(String(plan._id))) {
      enterpriseCustomers += 1;
    }
  }

  let mostPopularPlan: {
    id: string | null;
    name: string | null;
    organizations: number;
  } = {
    id: null,
    name: null,
    organizations: 0,
  };

  if (planPopularity.length > 0) {
    const top = planPopularity[0];
    const plan = await SubscriptionPlan.findById(top._id).select("name").lean();

    mostPopularPlan = {
      id: plan ? String(plan._id) : String(top._id),
      name: plan?.name ?? null,
      organizations: top.count,
    };
  }

  return {
    totalPlans,
    activePlans,
    totalActiveOrganizations: activeOrganizations,
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    enterpriseCustomers,
    mostPopularPlan,
    organizationsOnPaidPlans: organizationsWithPlans.length,
  };
}

export async function syncOrganizationUsage(organizationId: string) {
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    return null;
  }


  const organization = await Organization.findById(organizationId);

  if (!organization) {
    return null;
  }

  const orgObjectId = new mongoose.Types.ObjectId(organizationId);

  const [
    teamMembers,
    knowledgeFiles,
    conversationUsage,
    connectedWebsites,
    connectedWhatsappNumbers,
    storageBytes,
  ] = await Promise.all([
    User.countDocuments({ company: orgObjectId }),
    KnowledgeDocument.countDocuments({ organizationId: orgObjectId }),
    Conversation.countDocuments({ organizationId: orgObjectId }),
    organization.allowedChannels?.includes("website") ? 1 : 0,
    organization.allowedChannels?.filter((channel: string) => channel === "whatsapp")
      .length ?? 0,
    KnowledgeDocument.aggregate([
      { $match: { organizationId: orgObjectId } },
      { $group: { _id: null, total: { $sum: "$fileSize" } } },
    ]),
  ]);

  const storageUsageGb =
    storageBytes.length > 0 ? Number((storageBytes[0].total / (1024 * 1024 * 1024)).toFixed(4)) : 0;

  organization.usage = {
    conversationUsage,
    storageUsage: storageUsageGb,
    knowledgeFiles,
    connectedWebsites,
    connectedWhatsappNumbers,
    teamMembers,
  };

  await organization.save();

  return organization.usage;
}
