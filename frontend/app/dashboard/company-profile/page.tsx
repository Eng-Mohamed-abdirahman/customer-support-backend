"use client"

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react"

import { CompanyIdentityCard } from "@/components/company-profile/company-identity-card"
import { tabs } from "@/components/company-profile/company-profile-utils"
import { ProfileTab } from "@/components/company-profile/profile-tab"
import {
  BusinessTab,
  ContactTab,
  FeaturesTab,
  SupportTab,
} from "@/components/company-profile/settings-tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCompanyProfile } from "@/hooks/useCompanyProfile"
import { cn } from "@/lib/utils"

export default function CompanyProfilePage() {
  const {
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
  } = useCompanyProfile()

  const fieldsDisabled = isLoading || isSaving

  return (
    <div className="space-y-6">
      {/* ─── Page header ─── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace / Company
          </p>
          <h1 className="mt-1 text-[28px] leading-9 font-bold text-navy-800 sm:text-[32px] sm:leading-10">
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
      <CompanyIdentityCard
        isLoading={isLoading}
        profileData={profileData}
        brandData={brandData}
        displayLogoUrl={displayLogoUrl}
        displayBrandName={displayBrandName}
        companyInitial={companyInitial}
        companyAdminCount={companyAdminCount}
        staffCount={staffCount}
      />

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
          {activeTab === "profile" ? (
            <ProfileTab
              formData={formData}
              brandData={brandData}
              onFieldChange={handleFieldChange}
              disabled={fieldsDisabled}
            />
          ) : null}

          {activeTab === "contact" ? (
            <ContactTab formData={formData} onFieldChange={handleFieldChange} disabled={fieldsDisabled} />
          ) : null}

          {activeTab === "business" ? (
            <BusinessTab formData={formData} onFieldChange={handleFieldChange} disabled={fieldsDisabled} />
          ) : null}

          {activeTab === "support" ? (
            <SupportTab formData={formData} onFieldChange={handleFieldChange} disabled={fieldsDisabled} />
          ) : null}

          {activeTab === "features" ? (
            <FeaturesTab formData={formData} setFormData={setFormData} />
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
