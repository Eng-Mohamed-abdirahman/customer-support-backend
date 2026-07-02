export type PlanStatus = "active" | "disabled"

export type BillingCycle = "monthly" | "yearly"

export type SubscriptionPlan = {
  id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  maxWebsites: number
  maxWhatsappNumbers: number
  maxTeamMembers: number
  maxConversations: number
  knowledgeStorageGb: number
  analyticsEnabled: boolean
  knowledgeAiEnabled: boolean
  conversationSummaryEnabled: boolean
  faqInsightsEnabled: boolean
  sentimentAnalysisEnabled: boolean
  prioritySupport: boolean
  advancedSecurity: boolean
  whiteLabel: boolean
  customBranding: boolean
  apiAccess: boolean
  dedicatedManager: boolean
  status: PlanStatus
  duplicatedFrom?: string | null
  createdAt: string
  updatedAt: string
}

export type PlanDashboardStats = {
  totalPlans: number
  activePlans: number
  totalActiveOrganizations: number
  monthlyRevenue: number
  enterpriseCustomers: number
  mostPopularPlan: {
    id: string | null
    name: string | null
    organizations: number
  }
  organizationsOnPaidPlans: number
}

export type PlanListResult = {
  plans: SubscriptionPlan[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type PlanDetailResult = {
  plan: SubscriptionPlan
  assignedOrganizations: number
}

export type OrganizationSubscriptionRow = {
  organizationId: string
  organizationName: string
  planId: string | null
  planName: string
  billingCycle: BillingCycle
  subscriptionStatus: string
  expiresAt: string | null
  conversationsUsed: number
  storageUsedGb: number
  assignedBy: string
}

export type CreatePlanInput = {
  name: string
  description?: string
  monthlyPrice: number
  yearlyPrice: number
  maxWebsites: number
  maxWhatsappNumbers: number
  maxTeamMembers: number
  maxConversations: number
  knowledgeStorageGb: number
  analyticsEnabled?: boolean
  knowledgeAiEnabled?: boolean
  conversationSummaryEnabled?: boolean
  faqInsightsEnabled?: boolean
  sentimentAnalysisEnabled?: boolean
  prioritySupport?: boolean
  advancedSecurity?: boolean
  whiteLabel?: boolean
  customBranding?: boolean
  apiAccess?: boolean
  dedicatedManager?: boolean
  status?: PlanStatus
}

export type AssignPlanInput = {
  planId: string
  billingCycle: BillingCycle
  notes?: string
}

export type PlanOrganizationsResult = {
  plan: SubscriptionPlan
  organizations: Array<{
    organizationId: string
    organizationName: string
    planId: string | null
    subscriptionStatus: string
    billingCycle: BillingCycle
    expiresAt: string | null
    startedAt: string | null
    usage: {
      conversationsUsed: number
      storageUsedGb: number
      knowledgeFiles: number
      connectedWebsites: number
      connectedWhatsappNumbers: number
      teamMembers: number
    }
    limits: {
      maxWebsites: number
      maxWhatsappNumbers: number
      maxTeamMembers: number
      maxConversations: number
      knowledgeStorageGb: number
    }
  }>
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
