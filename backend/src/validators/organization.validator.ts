import { z } from "zod";

const organizationStatusSchema = z.enum(["trialing", "active", "suspended", "cancelled"]);

const optionalShortText = (label: string, max = 2000) =>
  z.string().trim().max(max, `${label} cannot exceed ${max} characters`).optional();

const companyAdminProfileSchema = z
  .object({
    profile: z.object({
      name: z
        .string()
        .trim()
        .min(2, "Company name must be at least 2 characters")
        .max(120, "Company name cannot exceed 120 characters"),
      logoUrl: optionalShortText("Logo URL", 1000),
      websiteUrl: optionalShortText("Website URL", 1000),
      businessType: optionalShortText("Business type", 200),
      description: optionalShortText("Description", 2000),
    }),
    contact: z.object({
      supportEmail: z.string().trim().email("Invalid support email address"),
      phone: optionalShortText("Phone", 120),
      address: optionalShortText("Address", 400),
    }),
    businessInfo: z
      .object({
        workingHours: optionalShortText("Working hours", 600),
        services: optionalShortText("Services", 2000),
        products: optionalShortText("Products", 2000),
        policies: optionalShortText("Policies", 3000),
        location: optionalShortText("Location", 400),
      })
      .optional(),
    supportSettings: z
      .object({
        fallbackMessage: optionalShortText("Fallback message", 1000),
        timezone: optionalShortText("Timezone", 120),
        language: optionalShortText("Language", 40),
      })
      .optional(),
  })
  .strict();

const superAdminSettingsSchema = z
  .object({
    status: organizationStatusSchema.optional(),
    aiSettings: z
      .object({
        aiEnabled: z.boolean().optional(),
        autoReplyEnabled: z.boolean().optional(),
        humanHandoffEnabled: z.boolean().optional(),
        modelName: optionalShortText("Model name", 120),
      })
      .optional(),
    allowedChannels: z
      .array(z.string().trim().min(1, "Channel names cannot be empty"))
      .min(1, "At least one channel is required")
      .optional(),
    apiSettings: z
      .object({
        apiKeyHash: optionalShortText("API key hash", 300),
        keyPrefix: optionalShortText("Key prefix", 80),
        totalTokensUsed: z
          .coerce
          .number()
          .int()
          .nonnegative("Total tokens used must be >= 0")
          .optional(),
        monthlyLimit: z
          .coerce
          .number()
          .int()
          .nonnegative("Monthly limit must be >= 0")
          .optional(),
      })
      .optional(),
    subscription: z
      .object({
        plan: optionalShortText("Plan", 80),
        stripeCustomerId: optionalShortText("Stripe customer ID", 200),
      })
      .optional(),
  })
  .strict()
  .refine((value: Record<string, unknown>) => Object.keys(value).length > 0, {
    message: "At least one admin setting is required",
  });

const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(120, "Company name cannot exceed 120 characters"),
  email: z.string().trim().email("Invalid email address"),
});

const updateMyOrganizationProfileSchema = z.object({
  profile: companyAdminProfileSchema.shape.profile,
  contact: companyAdminProfileSchema.shape.contact,
  businessInfo: companyAdminProfileSchema.shape.businessInfo,
  supportSettings: companyAdminProfileSchema.shape.supportSettings,
  enabledFeatures: z
    .array(z.string().trim().min(1, "Feature name cannot be empty"))
    .optional(),
}).strict();

const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "API key name must be at least 2 characters")
    .max(80, "API key name cannot exceed 80 characters")
    .optional(),
});

export {
  createOrganizationSchema,
  updateMyOrganizationProfileSchema,
  superAdminSettingsSchema as updateOrganizationAdminSettingsSchema,
  createApiKeySchema,
  organizationStatusSchema,
};

