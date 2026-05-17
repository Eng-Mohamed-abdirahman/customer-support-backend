"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Users2,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { createCompany, listOrganizations } from "@/services/company.service"
import type { SafeUser } from "@/types/auth"
import {
  createCompanySchema,
  type CreateCompanyInput,
  type OrganizationWithUsers,
} from "@/types/company"

type CompanyManagementPageProps = {
  title: string
  description: string
}

const usersPreviewLimit = 3

const rolePillClassMap: Record<string, string> = {
  admin: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  "company-admin": "bg-primary/10 text-primary",
  staff: "bg-secondary/10 text-secondary",
}

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

export function CompanyManagementPage({ title, description }: CompanyManagementPageProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationWithUsers[]>([])
  const [canManageAdminSettings, setCanManageAdminSettings] = useState(false)

  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      name: "",
      email: "",
    },
  })

  const loadOrganizations = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setLoadError(null)

    try {
      const rows = await listOrganizations()
      setOrganizations(rows)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load companies"
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
    void loadOrganizations(false)
  }, [loadOrganizations])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const rawUser = localStorage.getItem("user")
    if (!rawUser) {
      setCanManageAdminSettings(false)
      return
    }

    try {
      const parsedUser = JSON.parse(rawUser) as SafeUser
      setCanManageAdminSettings(parsedUser.platformRole === "super_admin")
    } catch {
      setCanManageAdminSettings(false)
    }
  }, [])

  const onSubmit = async (values: CreateCompanyInput) => {
    setSubmitError(null)
    setSuccessMessage(null)

    try {
      setIsSubmitting(true)

      const result = await createCompany({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
      })

      setSuccessMessage(
        `${result.organization.name} created. Invitation sent to ${result.invitation.email} as company-admin. API key (shown once): ${result.apiKey}`
      )
      setIsDialogOpen(false)
      form.reset()
      await loadOrganizations(true)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create company. Please try again."
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalUsers = useMemo(
    () => organizations.reduce((sum, organization) => sum + organization.userCount, 0),
    [organizations]
  )

  const companiesWithoutUsers = useMemo(
    () => organizations.filter((organization) => organization.userCount === 0).length,
    [organizations]
  )

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Platform / Companies
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2"
              onClick={() => void loadOrganizations(true)}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Refresh
            </Button>

            <Button
              type="button"
              className="h-9 gap-2 bg-linear-to-r from-primary to-secondary"
              onClick={() => {
                setSubmitError(null)
                setIsDialogOpen(true)
              }}
            >
              <Plus className="size-4" />
              New Company
            </Button>
          </div>
        </div>
      </header>

      {successMessage ? (
        <Alert>
          <CheckCircle2 className="size-4 text-primary" />
          <AlertTitle>Company invitation sent</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load companies</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/95 py-4">
          <CardHeader className="gap-2 px-4 pb-0">
            <CardDescription>Total companies</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Building2 className="size-5 text-primary" />
              {organizations.length.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/95 py-4">
          <CardHeader className="gap-2 px-4 pb-0">
            <CardDescription>Total users</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Users2 className="size-5 text-primary" />
              {totalUsers.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/95 py-4">
          <CardHeader className="gap-2 px-4 pb-0">
            <CardDescription>Pending onboarding</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Mail className="size-5 text-primary" />
              {companiesWithoutUsers.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card className="overflow-hidden border-border/70 bg-card/95 py-0">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="text-base">Existing companies and users</CardTitle>
          <CardDescription>
            Each row shows a company and the users currently registered under that workspace.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 px-4 py-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-border/60 p-3 md:grid-cols-4">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No companies yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Click New Company to create your first company and invite a company admin.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-220 border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/45">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Company
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Slug
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Users
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Created
                    </th>
                    {canManageAdminSettings ? (
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Actions
                      </th>
                    ) : null}
                  </tr>
                </thead>

                <tbody>
                  {organizations.map((organization) => (
                    <tr key={organization._id} className="border-b border-border/50 align-top">
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-foreground">{organization.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {organization.userCount} {organization.userCount === 1 ? "user" : "users"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-muted-foreground">{organization.slug}</td>

                      <td className="px-4 py-4">
                        {organization.users.length > 0 ? (
                          <div className="space-y-2">
                            {organization.users.slice(0, usersPreviewLimit).map((member) => (
                              <div
                                key={member._id}
                                className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-2"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-medium text-foreground">{member.fullName}</p>
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                                      rolePillClassMap[member.role] ?? "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    {member.role}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground">{member.email}</p>
                              </div>
                            ))}

                            {organization.users.length > usersPreviewLimit ? (
                              <p className="text-xs text-muted-foreground">
                                +{organization.users.length - usersPreviewLimit} more users
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No users have accepted invitations yet.
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatDate(organization.createdAt)}
                      </td>

                      {canManageAdminSettings ? (
                        <td className="px-4 py-4">
                          <Button type="button" variant="outline" className="h-8" asChild>
                            <Link href={`/dashboard/organizations/${organization._id}/settings`}>
                              Admin Settings
                            </Link>
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>
              Enter company name and admin email. The invitation role is automatically set to
              company-admin.
            </DialogDescription>
          </DialogHeader>

          {submitError ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Unable to create company</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc" autoComplete="organization" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company admin email</FormLabel>
                    <FormControl>
                      <Input placeholder="owner@acme.com" autoComplete="email" {...field} />
                    </FormControl>
                    <FormDescription>
                      This user will be invited as company-admin automatically.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Company"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
