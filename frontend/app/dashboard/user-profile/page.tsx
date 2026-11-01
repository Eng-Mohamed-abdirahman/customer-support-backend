"use client"

import { AlertCircle, Loader2, Mail, RefreshCw, Save, UserRound } from "lucide-react"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getCurrentUser,
  getStoredToken,
  updateCurrentUserProfile,
} from "@/services/auth.service"
import type { SafeUser, UpdateUserProfileInput } from "@/types/auth"

const resolveRoleLabel = (user: SafeUser | null) => {
  if (!user) {
    return "-"
  }

  if (user.platformRole) {
    return user.platformRole
  }

  if (user.membershipRole) {
    return `organization_${user.membershipRole}`
  }

  return user.role
}

export default function UserProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null)
  const [formValues, setFormValues] = useState<UpdateUserProfileInput>({
    firstName: "",
    lastName: "",
    email: "",
  })

  const loadCurrentUser = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setLoadError(null)

    try {
      const token = getStoredToken()

      if (!token) {
        throw new Error("You are not signed in.")
      }

      const user = await getCurrentUser(token)
      setCurrentUser(user)
      setFormValues({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      })
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load user profile."
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
    void loadCurrentUser(false)
  }, [loadCurrentUser])

  const roleLabel = useMemo(() => resolveRoleLabel(currentUser), [currentUser])
  const initials = useMemo(() => {
    if (!currentUser?.fullName) {
      return "TN"
    }

    return currentUser.fullName
      .split(" ")
      .map((segment) => segment[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }, [currentUser?.fullName])

  const updateFormField = (field: keyof UpdateUserProfileInput, value: string) => {
    setFormValues((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const firstName = formValues.firstName.trim()
    const lastName = formValues.lastName.trim()
    const email = formValues.email.trim().toLowerCase()

    if (firstName.length < 2) {
      toast.error("First name must be at least 2 characters.")
      return
    }

    if (lastName.length < 2) {
      toast.error("Last name must be at least 2 characters.")
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Please enter a valid email address.")
      return
    }

    try {
      setIsSaving(true)
      const updatedUser = await updateCurrentUserProfile({
        firstName,
        lastName,
        email,
      })

      setCurrentUser(updatedUser)
      setFormValues({
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
      })

      toast.success("User profile updated successfully.")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update user profile."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace / Account
          </p>
          <h1 className="mt-1 text-[28px] leading-9 font-bold text-navy-800 sm:text-[32px] sm:leading-10">
            User Profile
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage your personal identity and access details used across the workspace.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-9 gap-2"
          onClick={() => void loadCurrentUser(true)}
          disabled={isLoading || isRefreshing}
        >
          <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load user profile</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="group relative overflow-hidden border-border/70 bg-linear-to-br from-primary/4 via-transparent to-secondary/4">
        <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-secondary/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <CardContent className="relative flex flex-wrap items-center gap-5 p-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-xl font-bold text-primary shadow-sm">
            {isLoading ? "..." : initials}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
              {isLoading ? "Loading profile..." : (currentUser?.fullName ?? "-")}
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {isLoading ? "Loading email..." : (currentUser?.email ?? "-")}
            </p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-teal-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            {isLoading ? "..." : roleLabel}
          </div>
        </CardContent>
      </Card>

    

      <Card className="overflow-hidden border-border/70">
        <CardHeader className="border-b border-border/50 bg-muted/15 py-4">
          <CardTitle className="text-base">Edit Account Details</CardTitle>
          <CardDescription>
            Update your name and email. These details are used across the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <UserRound className="size-3.5 text-muted-foreground" />
                  First name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formValues.firstName}
                  onChange={(event) => updateFormField("firstName", event.target.value)}
                  autoComplete="given-name"
                  disabled={isLoading || isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-2">
                  <UserRound className="size-3.5 text-muted-foreground" />
                  Last name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formValues.lastName}
                  onChange={(event) => updateFormField("lastName", event.target.value)}
                  autoComplete="family-name"
                  disabled={isLoading || isSaving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="size-3.5 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formValues.email}
                onChange={(event) => updateFormField("email", event.target.value)}
                autoComplete="email"
                disabled={isLoading || isSaving}
              />
            </div>

            <div className="flex items-center justify-between border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground">
                Changes apply immediately after saving.
              </p>
              <Button type="submit" disabled={isLoading || isSaving} className="gap-2">
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}