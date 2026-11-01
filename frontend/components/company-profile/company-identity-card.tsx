"use client"

import { ShieldCheck, Users } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { CompanyBrandSummary, MyCompanyUsersResult } from "@/types/company"

import { formatDate } from "./company-profile-utils"

type CompanyIdentityCardProps = {
  isLoading: boolean
  profileData: MyCompanyUsersResult | null
  brandData: CompanyBrandSummary | null
  displayLogoUrl: string
  displayBrandName: string
  companyInitial: string
  companyAdminCount: number
  staffCount: number
}

export function CompanyIdentityCard({
  isLoading,
  profileData,
  brandData,
  displayLogoUrl,
  displayBrandName,
  companyInitial,
  companyAdminCount,
  staffCount,
}: CompanyIdentityCardProps) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden border-border/70">
        <CardContent className="flex items-center gap-5 p-6">
          <Skeleton className="size-16 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="group relative overflow-hidden border-border/70 bg-gradient-to-br from-primary/[0.04] via-transparent to-secondary/[0.04]">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <CardContent className="relative flex flex-wrap items-center gap-5 p-6">
        {/* Logo / Avatar */}
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-primary/10">
          {displayLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayLogoUrl}
              alt={`${displayBrandName} logo`}
              className="size-full object-contain p-1.5"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-white">
              {companyInitial}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {displayBrandName}
          </h2>
          <p className="text-sm text-muted-foreground">
            {profileData?.organization?.slug ? `@${profileData.organization.slug}` : "No slug assigned"}
          </p>
          {brandData ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                className="inline-block size-3.5 rounded-full border border-border"
                style={{ backgroundColor: brandData.primaryColor || "#000000" }}
                title="Primary color"
              />
              <span
                className="inline-block size-3.5 rounded-full border border-border"
                style={{ backgroundColor: brandData.secondaryColor || "#0058be" }}
                title="Secondary color"
              />
              <span className="text-xs text-muted-foreground">{brandData.fontStyle}</span>
            </div>
          ) : null}
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
  )
}
