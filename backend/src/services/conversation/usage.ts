import Organization from "../../models/Organization";

import { AppError } from "../../utils/appError";
import { normalizeText } from "./shared";
import type { ConversationOrganization, UsageSummary } from "./types";

export const assertOrganizationAllowsConversation = (
  organization: ConversationOrganization,
  channel: string
) => {
  if (organization.status === "suspended" || organization.status === "cancelled") {
    throw new AppError("This organization is not active for AI responses", 403);
  }

  const allowedChannels = Array.isArray(organization.allowedChannels)
    ? organization.allowedChannels.map((item) => normalizeText(item).toLowerCase())
    : ["website"];

  if (!allowedChannels.includes(channel.toLowerCase())) {
    throw new AppError(`Channel '${channel}' is not enabled for this organization`, 403);
  }

  const aiEnabled = Boolean(organization?.aiSettings?.aiEnabled ?? true);
  const autoReplyEnabled = Boolean(organization?.aiSettings?.autoReplyEnabled ?? true);

  if (!aiEnabled || !autoReplyEnabled) {
    throw new AppError("AI auto-reply is disabled for this organization", 403);
  }

  const totalUsed =
    typeof organization?.api_settings?.total_tokens_used === "number"
      ? organization.api_settings.total_tokens_used
      : 0;
  const monthlyLimit =
    typeof organization?.api_settings?.monthly_limit === "number"
      ? organization.api_settings.monthly_limit
      : 10000;

  if (monthlyLimit > 0 && totalUsed >= monthlyLimit) {
    throw new AppError("Monthly AI usage limit reached", 429);
  }
};

export const createUsageSummary = (
  organization: ConversationOrganization,
  usageDelta: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }
): UsageSummary => {
  const totalUsed =
    typeof organization?.api_settings?.total_tokens_used === "number"
      ? organization.api_settings.total_tokens_used
      : 0;
  const monthlyLimit =
    typeof organization?.api_settings?.monthly_limit === "number"
      ? organization.api_settings.monthly_limit
      : 10000;

  return {
    promptTokens: usageDelta.promptTokens,
    completionTokens: usageDelta.completionTokens,
    totalTokens: usageDelta.totalTokens,
    totalTokensUsed: totalUsed + usageDelta.totalTokens,
    monthlyLimit,
  };
};

export const incrementOrganizationTokenUsage = async (
  organizationId: string,
  totalTokens: number
): Promise<void> => {
  if (totalTokens <= 0) {
    return;
  }

  await Organization.updateOne(
    { _id: organizationId },
    {
      $inc: {
        "api_settings.total_tokens_used": totalTokens,
      },
    }
  );
};
