const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const {
  createOrganization,
  listOrganizations,
  listMyCompanyUsers,
  updateMyCompanyProfile,
  listMyCompanyApiKeys,
  createMyCompanyApiKey,
  revokeMyCompanyApiKey,
  revealMyCompanyApiKey,
  deleteMyCompanyApiKey,
  getMyCompanyApiKeySettings,
  rotateMyCompanyApiKey,
  getOrganizationAdminSettings,
  updateOrganizationAdminSettings,
} = require("../controllers/organization.controller");

const router = express.Router();

router.get("/", protect, listOrganizations);
router.get("/my-users", protect, listMyCompanyUsers);
router.get("/my-api-keys", protect, listMyCompanyApiKeys);
router.post("/my-api-keys", protect, createMyCompanyApiKey);
router.post("/my-api-keys/:apiKeyId/revoke", protect, revokeMyCompanyApiKey);
router.post("/my-api-keys/:apiKeyId/reveal", protect, revealMyCompanyApiKey);
router.delete("/my-api-keys/:apiKeyId", protect, deleteMyCompanyApiKey);
router.get("/my-api-key", protect, getMyCompanyApiKeySettings);
router.post("/my-api-key/rotate", protect, rotateMyCompanyApiKey);
router.patch("/my-profile", protect, updateMyCompanyProfile);
router.get("/:organizationId/admin-settings", protect, getOrganizationAdminSettings);
router.patch("/:organizationId/admin-settings", protect, updateOrganizationAdminSettings);
router.post("/", protect, createOrganization);

module.exports = router;

export {};
