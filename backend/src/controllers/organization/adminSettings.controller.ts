import { Request, Response } from "express";

import Organization from "../../models/Organization";

import { apiResponse } from "../../utils/apiResponse";
import { AppError } from "../../utils/appError";
import { asyncHandler } from "../../utils/asyncHandler";
import { updateOrganizationAdminSettingsSchema } from "../../validators/organization.validator";
import {
  assertPlatformAdmin,
  booleanOrDefault,
  buildAdminSettingsPayload,
  cleanString,
} from "./helpers";

const getOrganizationAdminSettings = asyncHandler(async (req: Request, res: Response) => {
  assertPlatformAdmin(req);

  const organizationId = req.params.organizationId;
  const organization = await Organization.findById(organizationId).select(
    "_id slug status profile contact businessInfo supportSettings aiSettings allowedChannels api_settings subscription createdAt"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  apiResponse(res, 200, "Organization settings fetched successfully", {
    organization: buildAdminSettingsPayload(organization),
  });
});

const updateOrganizationAdminSettings = asyncHandler(async (req: Request, res: Response) => {
  assertPlatformAdmin(req);

  const payload = { ...(req.body ?? {}) } as Record<string, unknown>;

  if (payload.iSettings && !payload.aiSettings) {
    payload.aiSettings = payload.iSettings;
  }

  if (payload.iSettings) {
    delete payload.iSettings;
  }

  const parsed = updateOrganizationAdminSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const organizationId = req.params.organizationId;
  const organization = await Organization.findById(organizationId).select(
    "_id slug status profile contact businessInfo supportSettings aiSettings allowedChannels api_settings subscription createdAt"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  if (parsed.data.status !== undefined) {
    organization.status = parsed.data.status;
  }

  if (parsed.data.aiSettings) {
    organization.aiSettings = {
      ...(organization.aiSettings || {}),
      aiEnabled: booleanOrDefault(
        parsed.data.aiSettings.aiEnabled,
        booleanOrDefault(organization.aiSettings?.aiEnabled, true)
      ),
      autoReplyEnabled: booleanOrDefault(
        parsed.data.aiSettings.autoReplyEnabled,
        booleanOrDefault(organization.aiSettings?.autoReplyEnabled, true)
      ),
      humanHandoffEnabled: booleanOrDefault(
        parsed.data.aiSettings.humanHandoffEnabled,
        booleanOrDefault(organization.aiSettings?.humanHandoffEnabled, true)
      ),
      modelName: cleanString(
        parsed.data.aiSettings.modelName,
        cleanString(organization.aiSettings?.modelName, "gpt-4o-mini")
      ),
    };
  }

  if (parsed.data.allowedChannels) {
    organization.allowedChannels = parsed.data.allowedChannels
      .map((value: string) => value.trim())
      .filter(Boolean);
  }

  if (parsed.data.apiSettings) {
    organization.set(
      "api_settings.key_prefix",
      cleanString(parsed.data.apiSettings.keyPrefix, cleanString(organization.api_settings?.key_prefix))
    );
    organization.set(
      "api_settings.total_tokens_used",
      parsed.data.apiSettings.totalTokensUsed !== undefined
        ? parsed.data.apiSettings.totalTokensUsed
        : typeof organization.api_settings?.total_tokens_used === "number"
          ? organization.api_settings.total_tokens_used
          : 0
    );
    organization.set(
      "api_settings.monthly_limit",
      parsed.data.apiSettings.monthlyLimit !== undefined
        ? parsed.data.apiSettings.monthlyLimit
        : typeof organization.api_settings?.monthly_limit === "number"
          ? organization.api_settings.monthly_limit
          : 10000
    );

    if (parsed.data.apiSettings.apiKeyHash !== undefined) {
      organization.set("api_settings.api_key_hash", cleanString(parsed.data.apiSettings.apiKeyHash));
      organization.set("api_settings.last_key_rotated_at", new Date());
    }
  }

  if (parsed.data.subscription) {
    organization.set(
      "subscription.plan",
      cleanString(parsed.data.subscription.plan, cleanString(organization.subscription?.plan, "free"))
    );
    organization.set(
      "subscription.stripeCustomerId",
      cleanString(
        parsed.data.subscription.stripeCustomerId,
        cleanString(organization.subscription?.stripeCustomerId)
      )
    );
  }

  await organization.save();

  apiResponse(res, 200, "Organization admin settings updated successfully", {
    organization: buildAdminSettingsPayload(organization),
  });
});

export {
  getOrganizationAdminSettings,
  updateOrganizationAdminSettings,
};
