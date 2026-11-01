import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  DEFAULT_FALLBACK_MESSAGE,
  DEFAULT_LANGUAGE,
  DEFAULT_TIMEZONE,
  emptyProfileForm,
  mapOrganizationToForm,
  type TabId,
} from "@/components/company-profile/company-profile-utils"
import { listMyCompanyUsers, updateMyCompanyProfile } from "@/services/company.service"
import type {
  CompanyBrandSummary,
  MyCompanyUsersResult,
  UpdateCompanyProfileInput,
} from "@/types/company"

export function useCompanyProfile() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<MyCompanyUsersResult | null>(null)
  const [brandData, setBrandData] = useState<CompanyBrandSummary | null>(null)
  const [formData, setFormData] = useState<UpdateCompanyProfileInput>(() => emptyProfileForm())
  const [activeTab, setActiveTab] = useState<TabId>("profile")
  const [saveSuccess, setSaveSuccess] = useState(false)

  const loadProfile = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setLoadError(null)

    try {
      const response = await listMyCompanyUsers()
      setProfileData(response)
      setBrandData(response.brand ?? null)
      setFormData(mapOrganizationToForm(response.organization))
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load company profile."

      setLoadError(message)
    } finally {
      if (refresh) {
        setIsRefreshing(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadProfile(false)
  }, [loadProfile])

  const companyAdminCount = useMemo(
    () => profileData?.users.filter((user) => user.role === "company-admin").length ?? 0,
    [profileData]
  )
  const staffCount = useMemo(
    () => profileData?.users.filter((user) => user.role === "staff").length ?? 0,
    [profileData]
  )

  const handleFieldChange = (
    section: keyof UpdateCompanyProfileInput,
    field: string,
    value: string
  ) => {
    setFormData((previous) => {
      const nextSection = {
        ...previous[section],
        [field]: value,
      }

      return {
        ...previous,
        [section]: nextSection,
      }
    })
  }

  const handleSaveCompanyProfile = async () => {
    const normalizedName = formData.profile.name.trim()
    const normalizedSupportEmail = formData.contact.supportEmail.trim().toLowerCase()

    if (normalizedName.length < 2) {
      toast.error("Company name must be at least 2 characters.")
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedSupportEmail)) {
      toast.error("Please provide a valid support email address.")
      return
    }

    const payload: UpdateCompanyProfileInput = {
      profile: {
        name: normalizedName,
        logoUrl: formData.profile.logoUrl.trim(),
        websiteUrl: formData.profile.websiteUrl.trim(),
        businessType: formData.profile.businessType.trim(),
        description: formData.profile.description.trim(),
      },
      contact: {
        supportEmail: normalizedSupportEmail,
        phone: formData.contact.phone.trim(),
        address: formData.contact.address.trim(),
      },
      businessInfo: {
        workingHours: formData.businessInfo.workingHours.trim(),
        services: formData.businessInfo.services.trim(),
        products: formData.businessInfo.products.trim(),
        policies: formData.businessInfo.policies.trim(),
        location: formData.businessInfo.location.trim(),
      },
      supportSettings: {
        fallbackMessage: formData.supportSettings.fallbackMessage.trim() || DEFAULT_FALLBACK_MESSAGE,
        timezone: formData.supportSettings.timezone.trim() || DEFAULT_TIMEZONE,
        language: formData.supportSettings.language.trim() || DEFAULT_LANGUAGE,
      },
      enabledFeatures: formData.enabledFeatures,
    }

    try {
      setIsSaving(true)
      const response = await updateMyCompanyProfile(payload)

      setProfileData((previous) => {
        if (!previous) {
          return {
            organization: response.organization,
            userCount: 0,
            users: [],
          }
        }

        return {
          ...previous,
          organization: response.organization,
        }
      })
      setFormData(mapOrganizationToForm(response.organization))

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      toast.success("Company profile updated successfully.")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update company profile."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const companyInitial = profileData?.organization?.name?.charAt(0)?.toUpperCase() ?? "C"
  const displayLogoUrl = brandData?.logoUrl || formData.profile.logoUrl
  const displayBrandName = brandData?.brandName || profileData?.organization?.name || "Your Company"

  return {
    isLoading,
    isRefreshing,
    isSaving,
    loadError,
    profileData,
    brandData,
    formData,
    setFormData,
    activeTab,
    setActiveTab,
    saveSuccess,
    loadProfile,
    companyAdminCount,
    staffCount,
    handleFieldChange,
    handleSaveCompanyProfile,
    companyInitial,
    displayLogoUrl,
    displayBrandName,
  }
}
