"use client"

import { AlertCircle, Building2, RefreshCw, ShieldCheck, Users } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { listMyCompanyUsers, updateMyCompanyProfile } from "@/services/company.service"
import type { MyCompanyUsersResult, UpdateCompanyProfileInput } from "@/types/company"

const DEFAULT_FALLBACK_MESSAGE = "Our team will get back to you shortly."
const DEFAULT_TIMEZONE = "Africa/Mogadishu"
const DEFAULT_LANGUAGE = "en"

const formatDate = (value: string) => {
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

const emptyProfileForm = (): UpdateCompanyProfileInput => ({
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
})

const mapOrganizationToForm = (
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
  }
}

const textAreaClassName =
  "flex min-h-24 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm"

export default function CompanyProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<MyCompanyUsersResult | null>(null)
  const [formData, setFormData] = useState<UpdateCompanyProfileInput>(() => emptyProfileForm())

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

      toast.success("Company profile updated successfully.")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update company profile."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Workspace / Company
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              Company Profile
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Review your company workspace identity, user footprint, and core account details.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2"
            onClick={() => void loadProfile(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load company profile</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <section className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Card key={index} className="border-border/70 bg-card/95 py-4">
              <CardHeader className="gap-2 px-4 pb-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
              <CardContent className="px-4 pt-1">
                <Skeleton className="h-4 w-36" />
              </CardContent>
            </Card>
          ))}
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/70 bg-card/95 py-4">
            <CardHeader className="gap-2 px-4 pb-1">
              <CardDescription>Company name</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Building2 className="size-5 text-primary" />
                {profileData?.organization.name ?? "-"}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/95 py-4">
            <CardHeader className="gap-2 px-4 pb-1">
              <CardDescription>Workspace slug</CardDescription>
              <CardTitle className="text-lg font-semibold tracking-tight">
                {profileData?.organization.slug ?? "-"}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/95 py-4">
            <CardHeader className="gap-2 px-4 pb-1">
              <CardDescription>Created</CardDescription>
              <CardTitle className="text-lg font-semibold tracking-tight">
                {profileData ? formatDate(profileData.organization.createdAt) : "-"}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/95 py-4">
            <CardHeader className="gap-2 px-4 pb-1">
              <CardDescription>Total users</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Users className="size-5 text-primary" />
                {profileData?.userCount ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/95 py-4">
            <CardHeader className="gap-2 px-4 pb-1">
              <CardDescription>Company admins</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <ShieldCheck className="size-5 text-primary" />
                {companyAdminCount}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/95 py-4">
            <CardHeader className="gap-2 px-4 pb-1">
              <CardDescription>Status</CardDescription>
              <CardTitle className="text-lg font-semibold tracking-tight uppercase">
                {profileData?.organization.status ?? "-"}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/95 py-4">
            <CardHeader className="gap-2 px-4 pb-1">
              <CardDescription>Staff members</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Users className="size-5 text-primary" />
                {staffCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </section>
      )}

      <Card className="border-border/70 bg-card/95 py-0">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Edit company-admin fields</CardTitle>
          <CardDescription>
            Update organization profile, contact, business information, and support settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-5">
          <div className="space-y-3 rounded-lg border border-border/70 p-4">
            <p className="text-sm font-semibold text-foreground">Profile</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profileName">Company name</Label>
                <Input
                  id="profileName"
                  value={formData.profile.name}
                  onChange={(event) =>
                    handleFieldChange("profile", "name", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                  autoComplete="organization"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileBusinessType">Business type</Label>
                <Input
                  id="profileBusinessType"
                  value={formData.profile.businessType}
                  onChange={(event) =>
                    handleFieldChange("profile", "businessType", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profileWebsiteUrl">Website URL</Label>
                <Input
                  id="profileWebsiteUrl"
                  value={formData.profile.websiteUrl}
                  onChange={(event) =>
                    handleFieldChange("profile", "websiteUrl", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                  autoComplete="url"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profileLogoUrl">Logo URL</Label>
                <Input
                  id="profileLogoUrl"
                  value={formData.profile.logoUrl}
                  onChange={(event) =>
                    handleFieldChange("profile", "logoUrl", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profileDescription">Description</Label>
                <textarea
                  id="profileDescription"
                  value={formData.profile.description}
                  onChange={(event) =>
                    handleFieldChange("profile", "description", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                  className={textAreaClassName}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 p-4">
            <p className="text-sm font-semibold text-foreground">Contact</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactSupportEmail">Support email</Label>
                <Input
                  id="contactSupportEmail"
                  value={formData.contact.supportEmail}
                  onChange={(event) =>
                    handleFieldChange("contact", "supportEmail", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contact.phone}
                  onChange={(event) => handleFieldChange("contact", "phone", event.target.value)}
                  disabled={isLoading || isSaving}
                  autoComplete="tel"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="contactAddress">Address</Label>
                <Input
                  id="contactAddress"
                  value={formData.contact.address}
                  onChange={(event) =>
                    handleFieldChange("contact", "address", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                  autoComplete="street-address"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 p-4">
            <p className="text-sm font-semibold text-foreground">Business info</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessInfoWorkingHours">Working hours</Label>
                <Input
                  id="businessInfoWorkingHours"
                  value={formData.businessInfo.workingHours}
                  onChange={(event) =>
                    handleFieldChange("businessInfo", "workingHours", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessInfoLocation">Location</Label>
                <Input
                  id="businessInfoLocation"
                  value={formData.businessInfo.location}
                  onChange={(event) =>
                    handleFieldChange("businessInfo", "location", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="businessInfoServices">Services</Label>
                <textarea
                  id="businessInfoServices"
                  value={formData.businessInfo.services}
                  onChange={(event) =>
                    handleFieldChange("businessInfo", "services", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                  className={textAreaClassName}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="businessInfoProducts">Products</Label>
                <textarea
                  id="businessInfoProducts"
                  value={formData.businessInfo.products}
                  onChange={(event) =>
                    handleFieldChange("businessInfo", "products", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                  className={textAreaClassName}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="businessInfoPolicies">Policies</Label>
                <textarea
                  id="businessInfoPolicies"
                  value={formData.businessInfo.policies}
                  onChange={(event) =>
                    handleFieldChange("businessInfo", "policies", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                  className={textAreaClassName}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 p-4">
            <p className="text-sm font-semibold text-foreground">Support settings</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supportTimezone">Timezone</Label>
                <Input
                  id="supportTimezone"
                  value={formData.supportSettings.timezone}
                  onChange={(event) =>
                    handleFieldChange("supportSettings", "timezone", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportLanguage">Language</Label>
                <Input
                  id="supportLanguage"
                  value={formData.supportSettings.language}
                  onChange={(event) =>
                    handleFieldChange("supportSettings", "language", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="supportFallbackMessage">Fallback message</Label>
                <textarea
                  id="supportFallbackMessage"
                  value={formData.supportSettings.fallbackMessage}
                  onChange={(event) =>
                    handleFieldChange("supportSettings", "fallbackMessage", event.target.value)
                  }
                  disabled={isLoading || isSaving}
                  className={textAreaClassName}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={handleSaveCompanyProfile} disabled={isLoading || isSaving}>
              {isSaving ? "Saving..." : "Save company profile"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}