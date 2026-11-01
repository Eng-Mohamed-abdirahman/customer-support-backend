"use client"

import { Building2, ExternalLink, Globe, Image as ImageIcon, Palette, ShoppingBag } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CompanyBrandSummary, UpdateCompanyProfileInput } from "@/types/company"

import type { CompanyProfileFieldChange } from "./company-profile-utils"
import { FieldGroup } from "./field-group"

type ProfileTabProps = {
  formData: UpdateCompanyProfileInput
  brandData: CompanyBrandSummary | null
  onFieldChange: CompanyProfileFieldChange
  disabled: boolean
}

export function ProfileTab({ formData, brandData, onFieldChange, disabled }: ProfileTabProps) {
  return (
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
            onChange={(e) => onFieldChange("profile", "name", e.target.value)}
            disabled={disabled}
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
            onChange={(e) => onFieldChange("profile", "businessType", e.target.value)}
            disabled={disabled}
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
          onChange={(e) => onFieldChange("profile", "websiteUrl", e.target.value)}
          disabled={disabled}
          placeholder="https://example.com"
          autoComplete="url"
        />
      </FieldGroup>

      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Palette className="size-4 text-primary" />
              Brand Identity
            </div>
            <p className="text-xs text-muted-foreground">
              Logo, colors, and typography are managed in Brand Settings.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard/brand">
              Edit Brand
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </div>

        {brandData ? (
          <div className="grid gap-4 md:grid-cols-[120px_1fr] items-start">
            <div className="aspect-square rounded-xl border border-border bg-card flex items-center justify-center p-3 overflow-hidden">
              {brandData.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brandData.logoUrl}
                  alt={`${brandData.brandName} logo`}
                  className="size-full object-contain"
                />
              ) : (
                <ImageIcon className="size-8 text-muted-foreground/50" />
              )}
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Brand Name</p>
                <p className="font-medium text-foreground">{brandData.brandName || "—"}</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Primary</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-6 rounded-md border border-border"
                      style={{ backgroundColor: brandData.primaryColor || "#000000" }}
                    />
                    <span className="font-mono text-xs">{brandData.primaryColor || "—"}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Secondary</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-6 rounded-md border border-border"
                      style={{ backgroundColor: brandData.secondaryColor || "#0058be" }}
                    />
                    <span className="font-mono text-xs">{brandData.secondaryColor || "—"}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Font</p>
                <p className="text-foreground">{brandData.fontStyle || "—"}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No brand identity configured yet. Set up your logo and colors in Brand Settings.
          </p>
        )}
      </div>

      <FieldGroup
        id="profileDescription"
        label="Description"
        icon={Building2}
        hint="Briefly describe what your company does"
      >
        <textarea
          id="profileDescription"
          value={formData.profile.description}
          onChange={(e) => onFieldChange("profile", "description", e.target.value)}
          disabled={disabled}
          placeholder="Tell your customers about your company..."
          className="flex min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        />
      </FieldGroup>
    </div>
  )
}
