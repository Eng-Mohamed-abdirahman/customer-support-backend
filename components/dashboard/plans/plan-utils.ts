import type { SubscriptionPlan } from "@/types/plan"

const UNLIMITED_THRESHOLD = 999_999

function isUnlimited(value: number) {
  return value >= UNLIMITED_THRESHOLD
}

function formatCount(value: number, singular: string, plural?: string) {
  if (isUnlimited(value)) return `Unlimited ${plural ?? `${singular}s`}`
  return `${value.toLocaleString()} ${value === 1 ? singular : plural ?? `${singular}s`}`
}

export function buildPlanFeatures(plan: SubscriptionPlan): string[] {
  const features: string[] = []

  if (plan.maxWebsites > 0 || isUnlimited(plan.maxWebsites)) {
    features.push(
      isUnlimited(plan.maxWebsites)
        ? "Unlimited Websites"
        : `${plan.maxWebsites} Website Integration${plan.maxWebsites > 1 ? "s" : ""}`
    )
  }

  if (plan.maxWhatsappNumbers > 0 || isUnlimited(plan.maxWhatsappNumbers)) {
    features.push(
      isUnlimited(plan.maxWhatsappNumbers)
        ? "Unlimited WhatsApp Numbers"
        : `${plan.maxWhatsappNumbers} WhatsApp Number${plan.maxWhatsappNumbers > 1 ? "s" : ""}`
    )
  }

  if (plan.maxTeamMembers > 0 || isUnlimited(plan.maxTeamMembers)) {
    features.push(formatCount(plan.maxTeamMembers, "Team Member"))
  }

  if (plan.maxConversations > 0 || isUnlimited(plan.maxConversations)) {
    features.push(
      isUnlimited(plan.maxConversations)
        ? "Unlimited Conversations"
        : `${plan.maxConversations.toLocaleString()} Conversations`
    )
  }

  if (plan.knowledgeAiEnabled) {
    features.push("Knowledge AI Training")
  }

  if (plan.knowledgeStorageGb > 0 || isUnlimited(plan.knowledgeStorageGb)) {
    features.push(
      isUnlimited(plan.knowledgeStorageGb)
        ? "Unlimited Storage"
        : `${plan.knowledgeStorageGb} GB Knowledge Storage`
    )
  }

  if (plan.analyticsEnabled) features.push("Analytics Dashboard")
  if (plan.conversationSummaryEnabled) features.push("AI Conversation Summary")
  if (plan.faqInsightsEnabled) features.push("Most Asked Questions")
  if (plan.faqInsightsEnabled || plan.sentimentAnalysisEnabled) features.push("AI Insights")
  if (plan.sentimentAnalysisEnabled) features.push("Sentiment Analysis")
  if (plan.dedicatedManager) features.push("Dedicated Account Manager")
  if (plan.advancedSecurity) features.push("Advanced Security")
  if (plan.whiteLabel) features.push("White Label")
  if (plan.whiteLabel) features.push("Remove Powered by TechNova")
  if (plan.prioritySupport) features.push("Priority Support")
  if (plan.customBranding) features.push("Custom Branding")
  if (plan.apiAccess) features.push("API Access")

  return features
}

export function formatPlanPrice(plan: SubscriptionPlan) {
  if (plan.monthlyPrice <= 0 && plan.yearlyPrice <= 0) {
    return "Custom Pricing"
  }

  return `$${plan.monthlyPrice.toLocaleString()}/month`
}

export function isMostPopularPlan(
  plan: SubscriptionPlan,
  stats?: { mostPopularPlan?: { id: string | null; name: string | null } }
) {
  if (stats?.mostPopularPlan?.id === plan.id) return true
  return /professional/i.test(plan.name)
}

export function formatRelativeUpdated(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
