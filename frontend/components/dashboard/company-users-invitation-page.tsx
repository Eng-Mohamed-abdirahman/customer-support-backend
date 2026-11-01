"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

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
import { listMyCompanyUsers } from "@/services/company.service"
import { createInvitation } from "@/services/invitation.service"
import type { MyCompanyUsersResult } from "@/types/company"
import {
  createCompanyUserInvitationSchema,
  type CreateCompanyUserInvitationInput,
} from "@/types/invitation"

type CompanyUsersInvitationPageProps = {
  title: string
  description: string
}

type InviteRole = "company-admin" | "staff"

const roleLabels: Record<InviteRole, string> = {
  "company-admin": "Company admin",
  staff: "Staff",
}

const roleDescriptions: Record<InviteRole, string> = {
  "company-admin": "Can manage workspace settings, users, and operational controls.",
  staff: "Can work on conversations and day-to-day support operations.",
}

const rolePillClassMap: Record<string, string> = {
  "company-admin": "bg-primary/10 text-primary",
  staff: "bg-secondary/10 text-secondary",
  admin: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "soon"
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
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

export function CompanyUsersInvitationPage({ title, description }: CompanyUsersInvitationPageProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [companyUsersData, setCompanyUsersData] = useState<MyCompanyUsersResult | null>(null)

  const form = useForm<CreateCompanyUserInvitationInput>({
    resolver: zodResolver(createCompanyUserInvitationSchema),
    defaultValues: {
      email: "",
      role: "staff",
    },
  })

  const selectedRole = form.watch("role")
  const selectedRoleDescription = useMemo(
    () => roleDescriptions[selectedRole],
    [selectedRole]
  )

  const loadCompanyUsers = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshingUsers(true)
    } else {
      setIsLoadingUsers(true)
    }

    setLoadError(null)

    try {
      const result = await listMyCompanyUsers()
      setCompanyUsersData(result)

      if (refresh) {
        toast.success("Users table refreshed successfully.")
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load company users. Please try again."

      setLoadError(message)
      toast.error(message)
    } finally {
      if (refresh) {
        setIsRefreshingUsers(false)
      } else {
        setIsLoadingUsers(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadCompanyUsers(false)
  }, [loadCompanyUsers])

  const onSubmit = async (values: CreateCompanyUserInvitationInput) => {
    setSubmitError(null)
    setSuccessMessage(null)

    try {
      setIsSubmitting(true)

      const result = await createInvitation({
        email: values.email.trim().toLowerCase(),
        role: values.role,
      })

      const invitedRoleLabel =
        result.role === "company-admin" ? roleLabels["company-admin"] : roleLabels.staff

      setSuccessMessage(
        `Invitation sent to ${result.email} as ${invitedRoleLabel}. Expires ${formatDateTime(result.expiresAt)}.`
      )
      toast.success(`Invitation sent to ${result.email} successfully.`)

      setIsDialogOpen(false)
      form.reset({ email: "", role: "staff" })
      await loadCompanyUsers(true)
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send invitation. Please try again."
      setSubmitError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const users = companyUsersData?.users ?? []
  const userCount = companyUsersData?.userCount ?? 0
  const companyAdminCount = users.filter((user) => user.role === "company-admin").length
  const staffCount = users.filter((user) => user.role === "staff").length
  const organizationName = companyUsersData?.organization.name ?? "Your company"

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Workspace / Users
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2"
              onClick={() => void loadCompanyUsers(true)}
              disabled={isLoadingUsers || isRefreshingUsers}
            >
              {isRefreshingUsers ? (
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
              Invite user
            </Button>
          </div>
        </div>
      </header>

      {successMessage ? (
        <Alert>
          <CheckCircle2 className="size-4 text-primary" />
          <AlertTitle>Invitation sent</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load users</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/95 py-4">
          <CardHeader className="gap-2 px-4 pb-1">
            <CardDescription>Total users</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Users className="size-5 text-primary" />
              {userCount.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-1">
            <p className="text-sm text-muted-foreground">Registered members in {organizationName}.</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 py-4">
          <CardHeader className="gap-2 px-4 pb-1">
            <CardDescription>Company admins</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <ShieldCheck className="size-5 text-primary" />
              {companyAdminCount.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-1">
            <p className="text-sm text-muted-foreground">Users with elevated workspace permissions.</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 py-4">
          <CardHeader className="gap-2 px-4 pb-1">
            <CardDescription>Staff members</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Users className="size-5 text-primary" />
              {staffCount.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-1">
            <p className="text-sm text-muted-foreground">Support agents handling daily operations.</p>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden border-border/70 bg-card/95 py-0">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="text-base">Users in your company</CardTitle>
          <CardDescription>
            Team members who have completed invitation setup and joined {organizationName}.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingUsers ? (
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
          ) : users.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No users yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Send invitations and users will appear here after completing their invitation link.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-180 border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/45">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Full name
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Email
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Role
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Joined
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-border/50 align-top">
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-foreground">{user.fullName}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                            rolePillClassMap[user.role] ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
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
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>
              Send a secure invitation link. The recipient sets password and profile details on the
              invitation page.
            </DialogDescription>
          </DialogHeader>

          {submitError ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Unable to send invitation</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="team.member@company.com"
                          autoComplete="email"
                          className="pl-8"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <select
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="staff">Staff</option>
                        <option value="company-admin">Company admin</option>
                      </select>
                    </FormControl>
                    <FormDescription>{selectedRoleDescription}</FormDescription>
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
                      Sending...
                    </>
                  ) : (
                    "Send invitation"
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