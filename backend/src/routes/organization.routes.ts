import express from "express";

import { protect } from "../middlewares/auth.middleware";
import { createOrganization, listOrganizations, listMyCompanyUsers, updateMyCompanyProfile, listMyCompanyApiKeys, createMyCompanyApiKey, revokeMyCompanyApiKey, revealMyCompanyApiKey, deleteMyCompanyApiKey, getMyCompanyApiKeySettings, getMyCompanyUsage, listOrganizationsUsage, rotateMyCompanyApiKey, getOrganizationAdminSettings, updateOrganizationAdminSettings } from "../controllers/organization.controller";
import { requirePlatformAdmin, requireCompanyAdmin, requireOrganizationMember } from "../middlewares/platformAdmin.middleware";
import { assignPlanToOrganization, changeOrganizationPlan, removePlanFromOrganization, getMyOrganizationSubscription, requestPlanUpgrade } from "../controllers/plan.controller";

const router = express.Router();

router.get("/", protect, listOrganizations);
router.get("/my-users", protect, listMyCompanyUsers);
router.get("/my-api-keys", protect, listMyCompanyApiKeys);
router.post("/my-api-keys", protect, createMyCompanyApiKey);
router.post("/my-api-keys/:apiKeyId/revoke", protect, revokeMyCompanyApiKey);
router.post("/my-api-keys/:apiKeyId/reveal", protect, revealMyCompanyApiKey);
router.delete("/my-api-keys/:apiKeyId", protect, deleteMyCompanyApiKey);
router.get("/my-api-key", protect, getMyCompanyApiKeySettings);
router.get("/my-usage", protect, getMyCompanyUsage);
router.get("/my-subscription", protect, requireOrganizationMember, getMyOrganizationSubscription);
router.post("/request-upgrade", protect, requireCompanyAdmin, requestPlanUpgrade);
router.get("/usage", protect, listOrganizationsUsage);
router.post("/my-api-key/rotate", protect, rotateMyCompanyApiKey);
router.patch("/my-profile", protect, updateMyCompanyProfile);
router.post("/:id/assign-plan", protect, requirePlatformAdmin, assignPlanToOrganization);
router.post("/:id/change-plan", protect, requirePlatformAdmin, changeOrganizationPlan);
router.post("/:id/remove-plan", protect, requirePlatformAdmin, removePlanFromOrganization);
router.get("/:organizationId/admin-settings", protect, getOrganizationAdminSettings);
router.patch("/:organizationId/admin-settings", protect, updateOrganizationAdminSettings);
router.post("/", protect, createOrganization);

export default router;

