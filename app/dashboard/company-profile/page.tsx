"use client"

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  ShoppingBag,
  Users,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { listMyCompanyUsers, updateMyCompanyProfile } from "@/services/company.service"
import type { MyCompanyUsersResult, UpdateCompanyProfileInput } from "@/types/company"

const DEFAULT_FALLBACK_MESSAGE = "Our team will get back to you shortly."
const DEFAULT_TIMEZONE = "Africa/Mogadishu"
const DEFAULT_LANGUAGE = "en"

type TabId = "profile" | "contact" | "business" | "support"

const tabs: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: "profile", label: "Profile", icon: Building2, description: "Company identity and branding" },
  { id: "contact", label: "Contact", icon: Mail, description: "Support email, phone, and address" },
  { id: "business", label: "Business", icon: ShoppingBag, description: "Services, products, and policies" },
  { id: "support", label: "Support", icon: MessageSquare, description: "Fallback messages and preferences" },
]

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

export default function CompanyProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<MyCompanyUsersResult | null>(null)
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

  return (
    <div className="space-y-6">
      {/* ─── Page header ─── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace / Company
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Company Profile
          </h1>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Manage your organization&apos;s identity, contact details, and support preferences.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-9 gap-2"
          onClick={() => void loadProfile(true)}
          disabled={isLoading || isRefreshing}
        >
          <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </header>

      {/* ─── Error alert ─── */}
      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load company profile</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {/* ─── Save success banner ─── */}
      {saveSuccess ? (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <AlertTitle className="text-emerald-700 dark:text-emerald-400">Changes saved</AlertTitle>
          <AlertDescription className="text-emerald-600 dark:text-emerald-500">
            Your company profile has been updated successfully.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* ─── Company Identity Hero Card ─── */}
      {isLoading ? (
        <Card className="overflow-hidden border-border/70">
          <CardContent className="flex items-center gap-5 p-6">
            <Skeleton className="size-16 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="group relative overflow-hidden border-border/70 bg-gradient-to-br from-primary/[0.04] via-transparent to-secondary/[0.04]">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <CardContent className="relative flex flex-wrap items-center gap-5 p-6">
            {/* Avatar / Initial */}
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-white shadow-lg shadow-primary/20">
              {companyInitial}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {profileData?.organization?.name ?? "Your Company"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {profileData?.organization?.slug ? `@${profileData.organization.slug}` : "No slug assigned"}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-lg font-semibold text-foreground">
                  <Users className="size-4 text-primary" />
                  {profileData?.userCount ?? 0}
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Total Users</p>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-lg font-semibold text-foreground">
                  <ShieldCheck className="size-4 text-primary" />
                  {companyAdminCount}
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Admins</p>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-lg font-semibold text-foreground">
                  <Users className="size-4 text-primary" />
                  {staffCount}
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Staff</p>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground capitalize">
                  {profileData?.organization?.status ?? "-"}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Status</p>
              </div>
              {profileData?.organization?.createdAt ? (
                <>
                  <div className="h-8 w-px bg-border/60" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(profileData.organization.createdAt)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Created</p>
                  </div>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Tabbed Editor ─── */}
      <Card className="overflow-hidden border-border/70">
        {/* Tab Navigation */}
        <div className="border-b border-border/60 bg-muted/30">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "group/tab relative flex shrink-0 items-center gap-2.5 px-5 py-3.5 text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn(
                    "size-4 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover/tab:text-foreground"
                  )} />
                  {tab.label}

                  {/* Active indicator */}
                  {isActive ? (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
                  ) : null}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Description */}
        <div className="border-b border-border/40 bg-muted/15 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            {tabs.find((t) => t.id === activeTab)?.description}
          </p>
        </div>

        {/* Tab Content */}
        <CardContent className="p-6">
          {/* ─── Profile Tab ─── */}
          {activeTab === "profile" ? (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <FieldGroup
                  id="profileName"
                  label="Company Name"
                  icon={Building2}
                  required
                >
                  <Input
                    id="profileName"
                    value={formData.profile.name}
                    onChange={(e) => handleFieldChange("profile", "name", e.target.value)}
                    disabled={isLoading || isSaving}
                    placeholder="e.g. Acme Inc"
                    autoComplete="organization"
                  />
                </FieldGroup>

                <FieldGroup
                  id="profileBusinessType"
                  label="Business Type"
                  icon={ShoppingBag}
                >
                  <Input
                    id="profileBusinessType"
                    value={formData.profile.businessType}
                    onChange={(e) => handleFieldChange("profile", "businessType", e.target.value)}
                    disabled={isLoading || isSaving}
                    placeholder="e.g. E-commerce, SaaS, Healthcare"
                  />
                </FieldGroup>
              </div>

              <FieldGroup
                id="profileWebsiteUrl"
                label="Website URL"
                icon={Globe}
              >
                <Input
                  id="profileWebsiteUrl"
                  value={formData.profile.websiteUrl}
                  onChange={(e) => handleFieldChange("profile", "websiteUrl", e.target.value)}
                  disabled={isLoading || isSaving}
                  placeholder="https://example.com"
                  autoComplete="url"
                />
              </FieldGroup>

              <FieldGroup
                id="profileLogoUrl"
                label="Logo URL"
                icon={Globe}
              >
                <Input
                  id="profileLogoUrl"
                  value={formData.profile.logoUrl}
                  onChange={(e) => handleFieldChange("profile", "logoUrl", e.target.value)}
                  disabled={isLoading || isSaving}
                  placeholder="https://example.com/logo.png"
                />
              </FieldGroup>

              <FieldGroup
                id="profileDescription"
                label="Description"
                icon={Building2}
                hint="Briefly describe what your company does"
              >
                <textarea
                  id="profileDescription"
                  value={formData.profile.description}
                  onChange={(e) => handleFieldChange("profile", "description", e.target.value)}
                  disabled={isLoading || isSaving}
                  placeholder="Tell your customers about your company..."
                  className="flex min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                />
              </FieldGroup>
            </div>
          ) : null}

          {/* ─── Contact Tab ─── */}
          {activeTab === "contact" ? (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <FieldGroup
                  id="contactSupportEmail"
                  label="Support Email"
                  icon={Mail}
                  required
                >
                  <Input
                    id="contactSupportEmail"
                    value={formData.contact.supportEmail}
                    onChange={(e) => handleFieldChange("contact", "supportEmail", e.target.value)}
                    disabled={isLoading || isSaving}
                    placeholder="support@yourcompany.com"
                    autoComplete="email"
                  />
                </FieldGroup>

                <FieldGroup
                  id="contactPhone"
                  label="Phone Number"
                  icon={Phone}
                >
                  <Input
                    id="contactPhone"
                    value={formData.contact.phone}
                    onChange={(e) => handleFieldChange("contact", "phone", e.target.value)}
                    disabled={isLoading || isSaving}
                    placeholder="+1 (555) 123-4567"
                    autoComplete="tel"
                  />
                </FieldGroup>
              </div>

              <FieldGroup
                id="contactAddress"
                label="Address"
                icon={MapPin}
              >
                <Input
                  id="contactAddress"
                  value={formData.contact.address}
                  onChange={(e) => handleFieldChange("contact", "address", e.target.value)}
                  disabled={isLoading || isSaving}
                  placeholder="123 Main Street, City, Country"
                  autoComplete="street-address"
                />
              </FieldGroup>
            </div>
          ) : null}

          {/* ─── Business Tab ─── */}
          {activeTab === "business" ? (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <FieldGroup
                  id="businessInfoWorkingHours"
                  label="Working Hours"
                  icon={Clock}
                >
                  <Input
                    id="businessInfoWorkingHours"
                    value={formData.businessInfo.workingHours}
                    onChange={(e) => handleFieldChange("businessInfo", "workingHours", e.target.value)}
                    disabled={isLoading || isSaving}
                    placeholder="Mon - Fri, 9:00 AM - 5:00 PM"
                  />
                </FieldGroup>

                <FieldGroup
                  id="businessInfoLocation"
                  label="Location"
                  icon={MapPin}
                >
                  <Input
                    id="businessInfoLocation"
                    value={formData.businessInfo.location}
                    onChange={(e) => handleFieldChange("businessInfo", "location", e.target.value)}
                    disabled={isLoading || isSaving}
                    placeholder="City, Country"
                  />
                </FieldGroup>
              </div>

              <FieldGroup
                id="businessInfoServices"
                label="Services"
                icon={ShoppingBag}
                hint="List the services your company offers"
              >
                <textarea
                  id="businessInfoServices"
                  value={formData.businessInfo.services}
                  onChange={(e) => handleFieldChange("businessInfo", "services", e.target.value)}
                  disabled={isLoading || isSaving}
                  placeholder="Describe the services you provide..."
                  className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                />
              </FieldGroup>

              <FieldGroup
                id="businessInfoProducts"
                label="Products"
                icon={ShoppingBag}
                hint="List the products your company offers"
              >
                <textarea
                  id="businessInfoProducts"
                  value={formData.businessInfo.products}
                  onChange={(e) => handleFieldChange("businessInfo", "products", e.target.value)}
                  disabled={isLoading || isSaving}
                  placeholder="Describe the products you sell..."
                  className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                />
              </FieldGroup>

              <FieldGroup
                id="businessInfoPolicies"
                label="Policies"
                icon={ShieldCheck}
                hint="Return, refund, and warranty policies"
              >
                <textarea
                  id="businessInfoPolicies"
                  value={formData.businessInfo.policies}
                  onChange={(e) => handleFieldChange("businessInfo", "policies", e.target.value)}
                  disabled={isLoading || isSaving}
                  placeholder="Describe your company policies..."
                  className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                />
              </FieldGroup>
            </div>
          ) : null}

          {/* ─── Support Tab ─── */}
          {activeTab === "support" ? (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <FieldGroup
                  id="supportTimezone"
                  label="Timezone"
                  icon={Globe}
                >
                  <Input
                    id="supportTimezone"
                    value={formData.supportSettings.timezone}
                    onChange={(e) => handleFieldChange("supportSettings", "timezone", e.target.value)}
                    disabled={isLoading || isSaving}
                    placeholder="e.g. Africa/Mogadishu"
                  />
                </FieldGroup>

                <FieldGroup
                  id="supportLanguage"
                  label="Language"
                  icon={Globe}
                >
                  <Input
                    id="supportLanguage"
                    value={formData.supportSettings.language}
                    onChange={(e) => handleFieldChange("supportSettings", "language", e.target.value)}
                    disabled={isLoading || isSaving}
                    placeholder="e.g. en, so, ar"
                  />
                </FieldGroup>
              </div>

              <FieldGroup
                id="supportFallbackMessage"
                label="Fallback Message"
                icon={MessageSquare}
                hint="Shown when AI cannot resolve a query"
              >
                <textarea
                  id="supportFallbackMessage"
                  value={formData.supportSettings.fallbackMessage}
                  onChange={(e) => handleFieldChange("supportSettings", "fallbackMessage", e.target.value)}
                  disabled={isLoading || isSaving}
                  placeholder="Our team will get back to you shortly."
                  className="flex min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                />
              </FieldGroup>
            </div>
          ) : null}

          {/* ─── Save Button ─── */}
          <div className="mt-8 flex items-center justify-between border-t border-border/50 pt-5">
            <p className="text-xs text-muted-foreground">
              Changes are saved across all tabs at once.
            </p>
            <Button
              type="button"
              onClick={handleSaveCompanyProfile}
              disabled={isLoading || isSaving}
              className="gap-2 bg-gradient-to-r from-primary to-secondary px-6 shadow-md shadow-primary/20 transition-shadow hover:shadow-lg hover:shadow-primary/30"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── Reusable field group component ─── */
function FieldGroup({
  id,
  label,
  icon: Icon,
  required,
  hint,
  children,
}: {
  id: string
  label: string
  icon: React.ElementType
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </Label>
      </div>
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
      {children}
    </div>
  )
}