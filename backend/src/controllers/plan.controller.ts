import { Request, Response } from "express";
import { apiResponse } from "../utils/apiResponse";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import * as planService from "../services/plan.service";
import * as planStatsService from "../services/plan-stats.service";
import type { PlanListFilters } from "../repositories/plan.repository";

const {
  assignPlanSchema,
  changePlanSchema,
  createPlanSchema,
  listAuditLogsSchema,
  listPlanOrganizationsSchema,
  listPlansSchema,
  removePlanSchema,
  requestUpgradeSchema,
  updatePlanSchema,
  updatePlanStatusSchema,
} = require("../validators/plan.validator");

function getActorContext(req: Request) {
  const user = (req as any).user;

  return {
    actorId: String(user._id),
    actorEmail: user.email ?? "",
    requestId: (req as any).requestId ?? "",
  };
}

function getRouteParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function parseOrThrow<T>(schema: { safeParse: (input: unknown) => any }, input: unknown): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  return parsed.data as T;
}

export const listPlans = asyncHandler(async (req: Request, res: Response) => {
  const filters = parseOrThrow<PlanListFilters>(listPlansSchema, req.query);
  const data = await planService.listPlans(filters);
  apiResponse(res, 200, "Plans fetched successfully", data);
});

export const getPlanDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const data = await planStatsService.getPlanDashboardStats();
  apiResponse(res, 200, "Plan dashboard statistics fetched successfully", data);
});

export const listPlanAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const filters = parseOrThrow<{
    action?: string;
    planId?: string;
    organizationId?: string;
    page?: number;
    limit?: number;
  }>(listAuditLogsSchema, req.query);
  const data = await planService.listPlanAuditLogs(filters);
  apiResponse(res, 200, "Plan audit logs fetched successfully", data);
});

export const getPlan = asyncHandler(async (req: Request, res: Response) => {
  const data = await planService.getPlanById(getRouteParam(req.params.id));
  apiResponse(res, 200, "Plan fetched successfully", data);
});

export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseOrThrow<Record<string, unknown>>(createPlanSchema, req.body);
  const plan = await planService.createPlan(payload, getActorContext(req));
  apiResponse(res, 201, "Plan created successfully", { plan });
});

export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseOrThrow<Record<string, unknown>>(updatePlanSchema, req.body);
  const plan = await planService.updatePlan(
    getRouteParam(req.params.id),
    payload,
    getActorContext(req)
  );
  apiResponse(res, 200, "Plan updated successfully", { plan });
});

export const deletePlan = asyncHandler(async (req: Request, res: Response) => {
  const data = await planService.deletePlan(getRouteParam(req.params.id), getActorContext(req));
  apiResponse(res, 200, "Plan deleted successfully", data);
});

export const duplicatePlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await planService.duplicatePlan(getRouteParam(req.params.id), getActorContext(req));
  apiResponse(res, 201, "Plan duplicated successfully", { plan });
});

export const updatePlanStatus = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseOrThrow<{ status: "active" | "disabled" }>(updatePlanStatusSchema, req.body);
  const plan = await planService.updatePlanStatus(
    getRouteParam(req.params.id),
    payload.status,
    getActorContext(req)
  );
  apiResponse(res, 200, "Plan status updated successfully", { plan });
});

export const getPlanOrganizations = asyncHandler(async (req: Request, res: Response) => {
  const filters = parseOrThrow<{
    page?: number;
    limit?: number;
    search?: string;
    subscriptionStatus?: string;
  }>(listPlanOrganizationsSchema, req.query);
  const planId = getRouteParam(req.params.id);
  const data = await planService.getPlanOrganizations(planId, {
    ...filters,
    planId,
  });
  apiResponse(res, 200, "Plan organizations fetched successfully", data);
});

export const assignPlanToOrganization = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseOrThrow<{
    planId: string;
    billingCycle: "monthly" | "yearly";
    notes?: string;
  }>(assignPlanSchema, req.body);
  const subscription = await planService.assignPlanToOrganization(
    getRouteParam(req.params.id),
    payload.planId,
    payload.billingCycle,
    getActorContext(req),
    payload.notes ?? ""
  );
  apiResponse(res, 200, "Plan assigned to organization successfully", { subscription });
});

export const changeOrganizationPlan = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseOrThrow<{
    planId: string;
    billingCycle: "monthly" | "yearly";
    notes?: string;
  }>(changePlanSchema, req.body);
  const subscription = await planService.changeOrganizationPlan(
    getRouteParam(req.params.id),
    payload.planId,
    payload.billingCycle,
    getActorContext(req),
    payload.notes ?? ""
  );
  apiResponse(res, 200, "Organization plan changed successfully", { subscription });
});

export const removePlanFromOrganization = asyncHandler(async (req: Request, res: Response) => {
  const payload = parseOrThrow<{ notes?: string }>(removePlanSchema, req.body ?? {});
  const subscription = await planService.removePlanFromOrganization(
    getRouteParam(req.params.id),
    getActorContext(req),
    payload.notes ?? ""
  );
  apiResponse(res, 200, "Plan removed from organization successfully", { subscription });
});

export const getMyOrganizationSubscription = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.company || user.organizationId;

  if (!organizationId) {
    throw new AppError("Organization context is required", 403);
  }

  await planStatsService.syncOrganizationUsage(String(organizationId));
  const data = await planService.getOrganizationSubscription(String(organizationId));
  apiResponse(res, 200, "Organization subscription fetched successfully", data);
});

export const requestPlanUpgrade = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const organizationId = user.company || user.organizationId;

  if (!organizationId) {
    throw new AppError("Organization context is required", 403);
  }

  const payload = parseOrThrow<{ planId: string; notes?: string }>(requestUpgradeSchema, req.body);
  const subscription = await planService.requestPlanUpgrade(
    String(organizationId),
    payload.planId,
    payload.notes ?? "",
    getActorContext(req)
  );
  apiResponse(res, 200, "Upgrade request submitted successfully", { subscription });
});
