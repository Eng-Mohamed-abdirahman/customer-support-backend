export function serializePlan(plan: any) {
  if (!plan) return null;

  return {
    id: String(plan._id),
    name: plan.name,
    description: plan.description ?? "",
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    maxWebsites: plan.maxWebsites,
    maxWhatsappNumbers: plan.maxWhatsappNumbers,
    maxTeamMembers: plan.maxTeamMembers,
    maxConversations: plan.maxConversations,
    knowledgeStorageGb: plan.knowledgeStorageGb,
    analyticsEnabled: Boolean(plan.analyticsEnabled),
    knowledgeAiEnabled: Boolean(plan.knowledgeAiEnabled),
    conversationSummaryEnabled: Boolean(plan.conversationSummaryEnabled),
    faqInsightsEnabled: Boolean(plan.faqInsightsEnabled),
    sentimentAnalysisEnabled: Boolean(plan.sentimentAnalysisEnabled),
    prioritySupport: Boolean(plan.prioritySupport),
    advancedSecurity: Boolean(plan.advancedSecurity),
    whiteLabel: Boolean(plan.whiteLabel),
    customBranding: Boolean(plan.customBranding),
    apiAccess: Boolean(plan.apiAccess),
    dedicatedManager: Boolean(plan.dedicatedManager),
    status: plan.status,
    duplicatedFrom: plan.duplicatedFrom ? String(plan.duplicatedFrom) : null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

export function buildEnabledFeaturesFromPlan(plan: any): string[] {
  const features: string[] = [];

  if (plan.knowledgeAiEnabled) features.push("knowledge_ai");
  if (plan.analyticsEnabled) features.push("analytics");
  if (plan.conversationSummaryEnabled) features.push("conversation_summary");
  if (plan.faqInsightsEnabled) features.push("faq_insights");
  if (plan.sentimentAnalysisEnabled) features.push("sentiment_analysis");
  if (plan.prioritySupport) features.push("priority_support");
  if (plan.advancedSecurity) features.push("advanced_security");
  if (plan.whiteLabel) features.push("white_label");
  if (plan.customBranding) features.push("custom_branding");
  if (plan.apiAccess) features.push("api_access");
  if (plan.dedicatedManager) features.push("dedicated_manager");

  return features;
}

export function calculateExpirationDate(
  billingCycle: "monthly" | "yearly",
  startDate = new Date()
): Date {
  const expiresAt = new Date(startDate);

  if (billingCycle === "yearly") {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  }

  return expiresAt;
}

export function serializeOrganizationSubscription(organization: any, plan: any = null) {
  return {
    organizationId: String(organization._id),
    organizationName: organization?.profile?.name ?? "",
    planId: organization.planId ? String(organization.planId) : null,
    plan: plan ? serializePlan(plan) : null,
    subscriptionStatus: organization?.subscription?.status ?? "trialing",
    billingCycle: organization?.subscription?.billingCycle ?? "monthly",
    expiresAt: organization?.subscription?.expiresAt ?? null,
    startedAt: organization?.subscription?.startedAt ?? null,
    legacyPlanName: organization?.subscription?.plan ?? "free",
    usage: {
      conversationsUsed: organization?.usage?.conversationUsage ?? 0,
      storageUsedGb: organization?.usage?.storageUsage ?? 0,
      knowledgeFiles: organization?.usage?.knowledgeFiles ?? 0,
      connectedWebsites: organization?.usage?.connectedWebsites ?? 0,
      connectedWhatsappNumbers: organization?.usage?.connectedWhatsappNumbers ?? 0,
      teamMembers: organization?.usage?.teamMembers ?? 0,
    },
    limits: {
      maxWebsites: organization?.planLimits?.maxWebsites ?? 1,
      maxWhatsappNumbers: organization?.planLimits?.maxWhatsappNumbers ?? 0,
      maxTeamMembers: organization?.planLimits?.maxTeamMembers ?? 1,
      maxConversations: organization?.planLimits?.maxConversations ?? 1000,
      knowledgeStorageGb: organization?.planLimits?.knowledgeStorageGb ?? 1,
    },
    upgradeRequest: {
      status: organization?.upgradeRequest?.status ?? "none",
      requestedPlanId: organization?.upgradeRequest?.requestedPlanId
        ? String(organization.upgradeRequest.requestedPlanId)
        : null,
      requestedAt: organization?.upgradeRequest?.requestedAt ?? null,
      notes: organization?.upgradeRequest?.notes ?? "",
    },
  };
}
