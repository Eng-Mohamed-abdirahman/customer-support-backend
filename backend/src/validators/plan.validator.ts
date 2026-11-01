import { z } from "zod";

const nonNegativeNumber = z.coerce.number().min(0, "Value cannot be negative");
const positiveInteger = z.coerce
  .number()
  .int("Must be a whole number")
  .min(0, "Value cannot be negative");
const storageGb = z.coerce
  .number()
  .min(0.1, "Storage must be at least 0.1 GB")
  .max(10000, "Storage cannot exceed 10,000 GB");

const planFeatureFields = {
  analyticsEnabled: z.boolean().optional(),
  knowledgeAiEnabled: z.boolean().optional(),
  conversationSummaryEnabled: z.boolean().optional(),
  faqInsightsEnabled: z.boolean().optional(),
  sentimentAnalysisEnabled: z.boolean().optional(),
  prioritySupport: z.boolean().optional(),
  advancedSecurity: z.boolean().optional(),
  whiteLabel: z.boolean().optional(),
  customBranding: z.boolean().optional(),
  apiAccess: z.boolean().optional(),
  dedicatedManager: z.boolean().optional(),
};

const createPlanSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Plan name must be at least 2 characters")
      .max(120, "Plan name cannot exceed 120 characters"),
    description: z.string().trim().max(2000).optional(),
    monthlyPrice: nonNegativeNumber,
    yearlyPrice: nonNegativeNumber,
    maxWebsites: positiveInteger,
    maxWhatsappNumbers: positiveInteger,
    maxTeamMembers: positiveInteger,
    maxConversations: positiveInteger,
    knowledgeStorageGb: storageGb,
    ...planFeatureFields,
    status: z.enum(["active", "disabled"]).optional(),
  })
  .strict();

const updatePlanSchema = createPlanSchema.partial().strict();

const listPlansSchema = z
  .object({
    status: z.enum(["active", "disabled"]).optional(),
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).max(1000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sortBy: z.enum(["name", "monthlyPrice", "createdAt", "updatedAt"]).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .strict();

const updatePlanStatusSchema = z
  .object({
    status: z.enum(["active", "disabled"]),
  })
  .strict();

const assignPlanSchema = z
  .object({
    planId: z.string().trim().min(1, "Plan ID is required"),
    billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

const changePlanSchema = assignPlanSchema;

const removePlanSchema = z
  .object({
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

const listPlanOrganizationsSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().max(120).optional(),
    subscriptionStatus: z
      .enum(["active", "trialing", "past_due", "cancelled", "suspended"])
      .optional(),
  })
  .strict();

const requestUpgradeSchema = z
  .object({
    planId: z.string().trim().min(1, "Plan ID is required"),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

const listAuditLogsSchema = z
  .object({
    action: z.string().trim().max(80).optional(),
    planId: z.string().trim().optional(),
    organizationId: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).max(1000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export {
  createPlanSchema,
  updatePlanSchema,
  listPlansSchema,
  updatePlanStatusSchema,
  assignPlanSchema,
  changePlanSchema,
  removePlanSchema,
  listPlanOrganizationsSchema,
  requestUpgradeSchema,
  listAuditLogsSchema,
};

