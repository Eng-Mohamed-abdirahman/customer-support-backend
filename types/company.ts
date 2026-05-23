import { z } from "zod"
import type { UserRole } from "@/types/auth"

export const createCompanySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(120, "Company name cannot exceed 120 characters"),
  email: z.string().trim().email("Invalid email address"),
})

export type CreateCompanyInput = z.infer<typeof createCompanySchema>

export type OrganizationStatus = "trialing" | "active" | "suspended" | "cancelled"

export type OrganizationProfile = {
  name: string
  logoUrl: string
  websiteUrl: string
  businessType: string
  description: string
}

export type OrganizationContact = {
  supportEmail: string
  phone: string
  address: string
}

export type OrganizationBusinessInfo = {
  workingHours: string
  services: string
  products: string
  policies: string
  location: string
}

export type OrganizationSupportSettings = {
  fallbackMessage: string
  timezone: string
  language: string
}

export type OrganizationAiSettings = {
  aiEnabled: boolean
  autoReplyEnabled: boolean
  humanHandoffEnabled: boolean
  modelName: string
}

export type OrganizationApiSettings = {
  keyPrefix: string
  totalTokensUsed: number
  monthlyLimit: number
  lastKeyRotatedAt?: string | null
}

export type OrganizationSubscription = {
  plan: string
  stripeCustomerId: string
}

export type CompanyAdminEditableOrganization = {
  _id: string
  name: string
  slug: string
  status: OrganizationStatus
  createdAt: string
  profile: OrganizationProfile
  contact: OrganizationContact
  businessInfo: OrganizationBusinessInfo
  supportSettings: OrganizationSupportSettings
}

export type OrganizationMember = {
  _id: string
  fullName: string
  email: string
  role: UserRole
  createdAt: string
}

export type OrganizationWithUsers = {
  _id: string
  name: string
  slug: string
  status: OrganizationStatus
  createdAt: string
  userCount: number
  users: OrganizationMember[]
}

export type CreateCompanyResult = {
  organization: {
    _id: string
    name: string
    slug: string
    status: OrganizationStatus
    createdAt: string
  }
  apiKey: string
  invitation: {
    invitationId: string
    email: string
    role: "company-admin"
    expiresAt: string
  }
}

export type CompanyUserRow = {
  _id: string
  fullName: string
  email: string
  role: UserRole
  createdAt: string
}

export type MyCompanyUsersResult = {
  organization: CompanyAdminEditableOrganization
  userCount: number
  users: CompanyUserRow[]
}

export type MyCompanyApiKeySettingsResult = {
  apiSettings: Pick<OrganizationApiSettings, "keyPrefix" | "lastKeyRotatedAt">
}

export type MyCompanyUsageResult = {
  organization: {
    _id: string
    name: string
    status: OrganizationStatus
    plan: string
  }
  usage: {
    totalTokensUsed: number
    monthlyLimit: number
  }
}

export type GlobalOrganizationUsageRow = MyCompanyUsageResult & {
  createdAt: string
}

export type RotateCompanyApiKeyResult = {
  apiKey: string
  apiKeyRecord?: CompanyApiKeyRecord
  apiSettings: Pick<OrganizationApiSettings, "keyPrefix" | "lastKeyRotatedAt">
}

export type CompanyApiKeyRecord = {
  id: string
  name: string
  keyPrefix: string
  createdAt: string | null
  lastUsedAt: string | null
  lastRevealedAt: string | null
  revokedAt: string | null
}

export type ListCompanyApiKeysResult = {
  apiKeys: CompanyApiKeyRecord[]
}

export type CreateCompanyApiKeyInput = {
  name: string
}

export type CreateCompanyApiKeyResult = {
  apiKey: string
  apiKeyRecord: CompanyApiKeyRecord
  apiSettings: Pick<OrganizationApiSettings, "keyPrefix" | "lastKeyRotatedAt">
}

export type RevokeCompanyApiKeyResult = {
  apiKeyRecord: CompanyApiKeyRecord
  apiSettings: Pick<OrganizationApiSettings, "keyPrefix" | "lastKeyRotatedAt">
}

export type UpdateCompanyProfileInput = {
  profile: OrganizationProfile
  contact: OrganizationContact
  businessInfo: OrganizationBusinessInfo
  supportSettings: OrganizationSupportSettings
}

export type UpdateCompanyProfileResult = {
  organization: CompanyAdminEditableOrganization
}

export type OrganizationAdminSettingsResult = {
  organization: CompanyAdminEditableOrganization & {
    aiSettings: OrganizationAiSettings
    allowedChannels: string[]
    apiSettings: OrganizationApiSettings
    subscription: OrganizationSubscription
  }
}

export type UpdateOrganizationAdminSettingsInput = {
  status: OrganizationStatus
  aiSettings: OrganizationAiSettings
  allowedChannels: string[]
  apiSettings: OrganizationApiSettings
  subscription: OrganizationSubscription
}

// Backward-compatible aliases for older imports.
export const createOrganizationInvitationSchema = createCompanySchema
export type CreateOrganizationInvitationInput = CreateCompanyInput
export const createCompanyInvitationSchema = createCompanySchema
export type CreateCompanyInvitationInput = CreateCompanyInput
