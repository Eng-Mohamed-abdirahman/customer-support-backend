import { AppError } from "../utils/appError";
import {
  buildEnabledFeaturesFromPlan,
  calculateExpirationDate,
  serializeOrganizationSubscription,
  serializePlan,
} from "../utils/plan.serializer";
import * as planRepository from "../repositories/plan.repository";
import * as auditRepository from "../repositories/plan-audit.repository";

const Organization = require("../models/Organization");

type ActorContext = {
  actorId: string;
  actorEmail?: string;
  requestId?: string;
};

export async function listPlans(filters: planRepository.PlanListFilters) {
  const result = await planRepository.findPlans(filters);

  return {
    plans: result.plans.map(serializePlan),
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit) || 1,
    },
  };
}

export async function getPlanById(planId: string) {
  const plan = await planRepository.findPlanById(planId);

  if (!plan) {
    throw new AppError("Plan not found", 404);
  }

  const assignedOrganizations = await planRepository.countOrganizationsOnPlan(planId);

  return {
    plan: serializePlan(plan),
    assignedOrganizations,
  };
}

export async function createPlan(
  payload: Record<string, unknown>,
  actor: ActorContext
) {
  const existing = await planRepository.findPlanByName(String(payload.name));

  if (existing) {
    throw new AppError("A plan with this name already exists", 409);
  }

  const plan = await planRepository.createPlan(payload);

  await auditRepository.createAuditLog({
    action: "plan_created",
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    planId: String(plan._id),
    metadata: { plan: serializePlan(plan) },
    requestId: actor.requestId,
  });

  return serializePlan(plan);
}

export async function updatePlan(
  planId: string,
  payload: Record<string, unknown>,
  actor: ActorContext
) {
  const existing = await planRepository.findPlanById(planId);

  if (!existing) {
    throw new AppError("Plan not found", 404);
  }

  if (payload.name) {
    const duplicate = await planRepository.findPlanByName(String(payload.name), planId);

    if (duplicate) {
      throw new AppError("A plan with this name already exists", 409);
    }
  }

  const updated = await planRepository.updatePlanById(planId, payload);

  if (!updated) {
    throw new AppError("Plan not found", 404);
  }

  await auditRepository.createAuditLog({
    action: "plan_updated",
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    planId,
    metadata: {
      before: serializePlan(existing),
      after: serializePlan(updated),
    },
    requestId: actor.requestId,
  });

  return serializePlan(updated);
}

export async function deletePlan(planId: string, actor: ActorContext) {
  const existing = await planRepository.findPlanById(planId);

  if (!existing) {
    throw new AppError("Plan not found", 404);
  }

  const assignedCount = await planRepository.countOrganizationsOnPlan(planId);

  if (assignedCount > 0) {
    throw new AppError(
      "Cannot delete a plan that is currently assigned to organizations",
      409
    );
  }

  await planRepository.deletePlanById(planId);

  await auditRepository.createAuditLog({
    action: "plan_deleted",
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    planId,
    metadata: { plan: serializePlan(existing) },
    requestId: actor.requestId,
  });

  return { deleted: true };
}

export async function duplicatePlan(planId: string, actor: ActorContext) {
  const existing = await planRepository.findPlanById(planId);

  if (!existing) {
    throw new AppError("Plan not found", 404);
  }

  let copyName = `Copy of ${existing.name}`;
  let suffix = 2;

  while (await planRepository.findPlanByName(copyName)) {
    copyName = `Copy of ${existing.name} (${suffix})`;
    suffix += 1;
  }

  const duplicated = await planRepository.createPlan({
    name: copyName,
    description: existing.description,
    monthlyPrice: existing.monthlyPrice,
    yearlyPrice: existing.yearlyPrice,
    maxWebsites: existing.maxWebsites,
    maxWhatsappNumbers: existing.maxWhatsappNumbers,
    maxTeamMembers: existing.maxTeamMembers,
    maxConversations: existing.maxConversations,
    knowledgeStorageGb: existing.knowledgeStorageGb,
    analyticsEnabled: existing.analyticsEnabled,
    knowledgeAiEnabled: existing.knowledgeAiEnabled,
    conversationSummaryEnabled: existing.conversationSummaryEnabled,
    faqInsightsEnabled: existing.faqInsightsEnabled,
    sentimentAnalysisEnabled: existing.sentimentAnalysisEnabled,
    prioritySupport: existing.prioritySupport,
    advancedSecurity: existing.advancedSecurity,
    whiteLabel: existing.whiteLabel,
    customBranding: existing.customBranding,
    apiAccess: existing.apiAccess,
    dedicatedManager: existing.dedicatedManager,
    status: "active",
    duplicatedFrom: existing._id,
  });

  await auditRepository.createAuditLog({
    action: "plan_duplicated",
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    planId: String(duplicated._id),
    metadata: {
      sourcePlanId: planId,
      sourcePlanName: existing.name,
    },
    requestId: actor.requestId,
  });

  return serializePlan(duplicated);
}

export async function updatePlanStatus(
  planId: string,
  status: "active" | "disabled",
  actor: ActorContext
) {
  const existing = await planRepository.findPlanById(planId);

  if (!existing) {
    throw new AppError("Plan not found", 404);
  }

  if (existing.status === status) {
    return serializePlan(existing);
  }

  const updated = await planRepository.updatePlanById(planId, { status });

  await auditRepository.createAuditLog({
    action: status === "disabled" ? "plan_disabled" : "plan_enabled",
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    planId,
    metadata: { previousStatus: existing.status, status },
    requestId: actor.requestId,
  });

  return serializePlan(updated);
}

export async function getPlanOrganizations(
  planId: string,
  filters: auditRepository.PlanOrganizationsFilters
) {
  const plan = await planRepository.findPlanById(planId);

  if (!plan) {
    throw new AppError("Plan not found", 404);
  }

  const result = await auditRepository.findOrganizationsByPlan({
    ...filters,
    planId,
  });

  return {
    plan: serializePlan(plan),
    organizations: result.organizations.map((organization: any) =>
      serializeOrganizationSubscription(organization, plan)
    ),
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit) || 1,
    },
  };
}

export async function listPlanAuditLogs(filters: {
  action?: string;
  planId?: string;
  organizationId?: string;
  page?: number;
  limit?: number;
}) {
  const result = await auditRepository.listAuditLogs(filters);

  return {
    logs: result.logs,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit) || 1,
    },
  };
}

function applyPlanToOrganization(
  organization: any,
  plan: any,
  billingCycle: "monthly" | "yearly"
) {
  const startedAt = new Date();
  const expiresAt = calculateExpirationDate(billingCycle, startedAt);

  organization.planId = plan._id;
  organization.subscription = {
    ...(organization.subscription || {}),
    plan: plan.name,
    status: "active",
    billingCycle,
    startedAt,
    expiresAt,
  };
  organization.status = "active";
  organization.planLimits = {
    maxWebsites: plan.maxWebsites,
    maxWhatsappNumbers: plan.maxWhatsappNumbers,
    maxTeamMembers: plan.maxTeamMembers,
    maxConversations: plan.maxConversations,
    knowledgeStorageGb: plan.knowledgeStorageGb,
  };
  organization.api_settings = {
    ...(organization.api_settings || {}),
    monthly_limit: plan.maxConversations,
  };
  organization.enabledFeatures = buildEnabledFeaturesFromPlan(plan);
  organization.upgradeRequest = {
    status: "none",
    requestedPlanId: null,
    requestedAt: null,
    notes: "",
  };

  return { startedAt, expiresAt };
}

export async function assignPlanToOrganization(
  organizationId: string,
  planId: string,
  billingCycle: "monthly" | "yearly",
  actor: ActorContext,
  notes = ""
) {
  const [organization, plan] = await Promise.all([
    Organization.findById(organizationId),
    planRepository.findPlanById(planId),
  ]);

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  if (!plan) {
    throw new AppError("Plan not found", 404);
  }

  if (plan.status !== "active") {
    throw new AppError("Cannot assign a disabled plan", 400);
  }

  if (organization.planId) {
    throw new AppError(
      "Organization already has a plan assigned. Use change-plan instead.",
      409
    );
  }

  const previousPlanId = organization.planId ? String(organization.planId) : null;
  const { expiresAt } = applyPlanToOrganization(organization, plan, billingCycle);

  await organization.save();

  await auditRepository.createAssignmentHistory({
    organizationId,
    planId,
    previousPlanId,
    action: "assigned",
    billingCycle,
    expiresAt,
    assignedBy: actor.actorId,
    notes,
  });

  await auditRepository.createAuditLog({
    action: "plan_assigned",
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    planId,
    organizationId,
    metadata: { billingCycle, notes },
    requestId: actor.requestId,
  });

  return serializeOrganizationSubscription(organization, plan);
}

export async function changeOrganizationPlan(
  organizationId: string,
  planId: string,
  billingCycle: "monthly" | "yearly",
  actor: ActorContext,
  notes = ""
) {
  const [organization, plan] = await Promise.all([
    Organization.findById(organizationId),
    planRepository.findPlanById(planId),
  ]);

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  if (!plan) {
    throw new AppError("Plan not found", 404);
  }

  if (plan.status !== "active") {
    throw new AppError("Cannot assign a disabled plan", 400);
  }

  if (!organization.planId) {
    throw new AppError(
      "Organization does not have a plan assigned. Use assign-plan instead.",
      409
    );
  }

  const previousPlanId = String(organization.planId);
  const { expiresAt } = applyPlanToOrganization(organization, plan, billingCycle);

  await organization.save();

  await auditRepository.createAssignmentHistory({
    organizationId,
    planId,
    previousPlanId,
    action: "changed",
    billingCycle,
    expiresAt,
    assignedBy: actor.actorId,
    notes,
  });

  await auditRepository.createAuditLog({
    action: "plan_changed",
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    planId,
    organizationId,
    metadata: { previousPlanId, billingCycle, notes },
    requestId: actor.requestId,
  });

  return serializeOrganizationSubscription(organization, plan);
}

export async function removePlanFromOrganization(
  organizationId: string,
  actor: ActorContext,
  notes = ""
) {
  const organization = await Organization.findById(organizationId);

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  if (!organization.planId) {
    throw new AppError("Organization does not have a plan assigned", 409);
  }

  const previousPlanId = String(organization.planId);

  organization.planId = null;
  organization.subscription = {
    ...(organization.subscription || {}),
    plan: "free",
    status: "cancelled",
    billingCycle: "monthly",
    startedAt: null,
    expiresAt: null,
  };
  organization.status = "cancelled";
  organization.planLimits = {
    maxWebsites: 1,
    maxWhatsappNumbers: 0,
    maxTeamMembers: 1,
    maxConversations: 1000,
    knowledgeStorageGb: 1,
  };
  organization.api_settings = {
    ...(organization.api_settings || {}),
    monthly_limit: 1000,
  };
  organization.enabledFeatures = [];

  await organization.save();

  await auditRepository.createAssignmentHistory({
    organizationId,
    planId: null,
    previousPlanId,
    action: "removed",
    assignedBy: actor.actorId,
    notes,
  });

  await auditRepository.createAuditLog({
    action: "plan_removed",
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    planId: previousPlanId,
    organizationId,
    metadata: { notes },
    requestId: actor.requestId,
  });

  return serializeOrganizationSubscription(organization, null);
}

export async function getOrganizationSubscription(organizationId: string) {
  const organization = await Organization.findById(organizationId).lean();

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  let plan = null;

  if (organization.planId) {
    plan = await planRepository.findPlanById(String(organization.planId));
  }

  const history = await auditRepository.listAssignmentHistory(organizationId, 10);

  return {
    subscription: serializeOrganizationSubscription(organization, plan),
    assignmentHistory: history,
  };
}

export async function requestPlanUpgrade(
  organizationId: string,
  planId: string,
  notes: string,
  actor: ActorContext
) {
  const [organization, plan] = await Promise.all([
    Organization.findById(organizationId),
    planRepository.findPlanById(planId),
  ]);

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  if (!plan) {
    throw new AppError("Plan not found", 404);
  }

  if (plan.status !== "active") {
    throw new AppError("Requested plan is not available", 400);
  }

  if (organization.upgradeRequest?.status === "pending") {
    throw new AppError("An upgrade request is already pending", 409);
  }

  organization.upgradeRequest = {
    status: "pending",
    requestedPlanId: plan._id,
    requestedAt: new Date(),
    notes,
  };

  await organization.save();

  await auditRepository.createAuditLog({
    action: "upgrade_requested",
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    planId,
    organizationId,
    metadata: { notes },
    requestId: actor.requestId,
  });

  return serializeOrganizationSubscription(organization, plan);
}
