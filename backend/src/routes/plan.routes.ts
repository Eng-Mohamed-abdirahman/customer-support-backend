import express from "express";
import { protect } from "../middlewares/auth.middleware";
import { requirePlatformAdmin, requireCompanyAdmin, requireOrganizationMember } from "../middlewares/platformAdmin.middleware";
import { listPlans, getPlan, createPlan, updatePlan, deletePlan, duplicatePlan, updatePlanStatus, getPlanOrganizations, getPlanDashboardStats, listPlanAuditLogs } from "../controllers/plan.controller";

const router = express.Router();

router.use(protect);

router.get("/stats/overview", requirePlatformAdmin, getPlanDashboardStats);
router.get("/audit-logs", requirePlatformAdmin, listPlanAuditLogs);
router.get("/", requirePlatformAdmin, listPlans);
router.post("/", requirePlatformAdmin, createPlan);
router.get("/:id", requirePlatformAdmin, getPlan);
router.put("/:id", requirePlatformAdmin, updatePlan);
router.delete("/:id", requirePlatformAdmin, deletePlan);
router.post("/:id/duplicate", requirePlatformAdmin, duplicatePlan);
router.patch("/:id/status", requirePlatformAdmin, updatePlanStatus);
router.get("/:id/organizations", requirePlatformAdmin, getPlanOrganizations);

export default router;

