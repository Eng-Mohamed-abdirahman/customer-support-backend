"use client"

import { AlertCircle, RefreshCw, ShieldCheck, UserRound } from "lucide-react"
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
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Workspace / Account
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              User Profile
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              View your account identity and role details used for workspace access and routing.
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
        </div>
      </header>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load user profile</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/95 py-4">
          <CardHeader className="gap-2 px-4 pb-1">
            <CardDescription>Full name</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <UserRound className="size-5 text-primary" />
              {isLoading ? "Loading..." : (currentUser?.fullName ?? "-")}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/95 py-4">
          <CardHeader className="gap-2 px-4 pb-1">
            <CardDescription>Email</CardDescription>
            <CardTitle className="text-lg font-semibold tracking-tight break-all">
              {isLoading ? "Loading..." : (currentUser?.email ?? "-")}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/95 py-4">
          <CardHeader className="gap-2 px-4 pb-1">
            <CardDescription>Access role</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <ShieldCheck className="size-5 text-primary" />
              {isLoading ? "Loading..." : roleLabel}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/70 bg-card/95 py-4">
          <CardHeader className="gap-2 px-4 pb-1">
            <CardDescription>Company ID</CardDescription>
            <CardTitle className="text-lg font-semibold tracking-tight break-all">
              {isLoading ? "Loading..." : (currentUser?.company ?? "No company")}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/95 py-0">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Edit profile</CardTitle>
          <CardDescription>
            Update your account details used across the dashboard and invitations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pb-5">
          <form onSubmit={handleSaveProfile} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
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
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formValues.lastName}
                onChange={(event) => updateFormField("lastName", event.target.value)}
                autoComplete="family-name"
                disabled={isLoading || isSaving}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
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

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isLoading || isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}