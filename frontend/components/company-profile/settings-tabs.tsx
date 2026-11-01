"use client"

import { Clock, Globe, Mail, MapPin, MessageSquare, Phone, ShieldCheck, ShoppingBag } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"

import { Input } from "@/components/ui/input"
import type { UpdateCompanyProfileInput } from "@/types/company"

import type { CompanyProfileFieldChange } from "./company-profile-utils"
import { FeatureToggle, FieldGroup } from "./field-group"

type TabFieldProps = {
  formData: UpdateCompanyProfileInput
  onFieldChange: CompanyProfileFieldChange
  disabled: boolean
}

/* ─── Contact Tab ─── */
export function ContactTab({ formData, onFieldChange, disabled }: TabFieldProps) {
  return (
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
            onChange={(e) => onFieldChange("contact", "supportEmail", e.target.value)}
            disabled={disabled}
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
            onChange={(e) => onFieldChange("contact", "phone", e.target.value)}
            disabled={disabled}
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
          onChange={(e) => onFieldChange("contact", "address", e.target.value)}
          disabled={disabled}
          placeholder="123 Main Street, City, Country"
          autoComplete="street-address"
        />
      </FieldGroup>
    </div>
  )
}

/* ─── Business Tab ─── */
export function BusinessTab({ formData, onFieldChange, disabled }: TabFieldProps) {
  return (
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
            onChange={(e) => onFieldChange("businessInfo", "workingHours", e.target.value)}
            disabled={disabled}
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
            onChange={(e) => onFieldChange("businessInfo", "location", e.target.value)}
            disabled={disabled}
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
          onChange={(e) => onFieldChange("businessInfo", "services", e.target.value)}
          disabled={disabled}
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
          onChange={(e) => onFieldChange("businessInfo", "products", e.target.value)}
          disabled={disabled}
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
          onChange={(e) => onFieldChange("businessInfo", "policies", e.target.value)}
          disabled={disabled}
          placeholder="Describe your company policies..."
          className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        />
      </FieldGroup>
    </div>
  )
}

/* ─── Support Tab ─── */
export function SupportTab({ formData, onFieldChange, disabled }: TabFieldProps) {
  return (
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
            onChange={(e) => onFieldChange("supportSettings", "timezone", e.target.value)}
            disabled={disabled}
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
            onChange={(e) => onFieldChange("supportSettings", "language", e.target.value)}
            disabled={disabled}
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
          onChange={(e) => onFieldChange("supportSettings", "fallbackMessage", e.target.value)}
          disabled={disabled}
          placeholder="Our team will get back to you shortly."
          className="flex min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        />
      </FieldGroup>
    </div>
  )
}

/* ─── Features Tab ─── */
export function FeaturesTab({
  formData,
  setFormData,
}: {
  formData: UpdateCompanyProfileInput
  setFormData: Dispatch<SetStateAction<UpdateCompanyProfileInput>>
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Toggle optional AI capabilities for your organization. Core features like support, tickets, and human handoff are always enabled.
      </p>
      <FeatureToggle
        id="orders"
        label="Orders"
        description="Allow the AI to collect and create customer orders during conversations."
        enabled={(formData.enabledFeatures ?? []).includes("orders")}
        onChange={(checked) => {
          setFormData((prev) => {
            const current = prev.enabledFeatures ?? []
            return {
              ...prev,
              enabledFeatures: checked
                ? [...current.filter((f) => f !== "orders"), "orders"]
                : current.filter((f) => f !== "orders"),
            }
          })
        }}
      />
    </div>
  )
}
