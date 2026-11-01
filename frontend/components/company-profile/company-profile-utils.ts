import { Building2, Mail, MessageSquare, ShoppingBag, Zap } from "lucide-react"

import type { MyCompanyUsersResult, UpdateCompanyProfileInput } from "@/types/company"

export const DEFAULT_FALLBACK_MESSAGE = "Our team will get back to you shortly."
export const DEFAULT_TIMEZONE = "Africa/Mogadishu"
export const DEFAULT_LANGUAGE = "en"

export type TabId = "profile" | "contact" | "business" | "support" | "features"

export const tabs: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: "profile", label: "Profile", icon: Building2, description: "Company identity and branding" },
  { id: "contact", label: "Contact", icon: Mail, description: "Support email, phone, and address" },
  { id: "business", label: "Business", icon: ShoppingBag, description: "Services, products, and policies" },
  { id: "support", label: "Support", icon: MessageSquare, description: "Fallback messages and preferences" },
  { id: "features", label: "Features", icon: Zap, description: "Enable optional AI capabilities for your organization" },
]

export type CompanyProfileFieldChange = (
  section: keyof UpdateCompanyProfileInput,
  field: string,
  value: string
) => void

export const formatDate = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export const emptyProfileForm = (): UpdateCompanyProfileInput => ({
  profile: {
    name: "",
    logoUrl: "",
    websiteUrl: "",
    businessType: "",
    description: "",
  },
  contact: {
    supportEmail: "",
    phone: "",
    address: "",
  },
  businessInfo: {
    workingHours: "",
    services: "",
    products: "",
    policies: "",
    location: "",
  },
  supportSettings: {
    fallbackMessage: DEFAULT_FALLBACK_MESSAGE,
    timezone: DEFAULT_TIMEZONE,
    language: DEFAULT_LANGUAGE,
  },
  enabledFeatures: [],
})

export const mapOrganizationToForm = (
  organization: MyCompanyUsersResult["organization"] | null | undefined
): UpdateCompanyProfileInput => {
  if (!organization) {
    return emptyProfileForm()
  }

  return {
    profile: {
      name: organization.profile.name,
      logoUrl: organization.profile.logoUrl,
      websiteUrl: organization.profile.websiteUrl,
      businessType: organization.profile.businessType,
      description: organization.profile.description,
    },
    contact: {
      supportEmail: organization.contact.supportEmail,
      phone: organization.contact.phone,
      address: organization.contact.address,
    },
    businessInfo: {
      workingHours: organization.businessInfo.workingHours,
      services: organization.businessInfo.services,
      products: organization.businessInfo.products,
      policies: organization.businessInfo.policies,
      location: organization.businessInfo.location,
    },
    supportSettings: {
      fallbackMessage: organization.supportSettings.fallbackMessage || DEFAULT_FALLBACK_MESSAGE,
      timezone: organization.supportSettings.timezone || DEFAULT_TIMEZONE,
      language: organization.supportSettings.language || DEFAULT_LANGUAGE,
    },
    enabledFeatures: Array.isArray(organization.enabledFeatures) ? organization.enabledFeatures : [],
  }
}
