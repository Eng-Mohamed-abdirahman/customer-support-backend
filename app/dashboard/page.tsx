"use client"

import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  Copy,
  KeyRound,
  MessageSquareText,
  PlugZap,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { MembershipRole, SafeUser } from "@/types/auth"

type StoredUser = Pick<SafeUser, "fullName" | "platformRole" | "membershipRole">

type DashboardMetric = {
  label: string
  value: string
  helper: string
}

type QuickAction = {
  title: string
  description: string
  href: string
  icon: typeof MessageSquareText
}

type ActivityEntry = {
  title: string
  description: string
  timestamp: string
}

type DashboardRoleContext = {
  platformRole: SafeUser["platformRole"]
  membershipRole: MembershipRole | null
  isSuperAdmin: boolean
  isPlatformAdmin: boolean
  isOrgAdmin: boolean
}

type DashboardContent = {
  overviewMetrics: DashboardMetric[]
  quickActions: QuickAction[]
  activityFeed: ActivityEntry[]
  welcomeDescription: string
}

const oneTimeApiKeyStorageKey = "supportly:onboarding-api-key"

const resolveRoleContext = (user: StoredUser | null): DashboardRoleContext => {
  const platformRole = user?.platformRole ?? null
  const membershipRole = user?.membershipRole ?? null

  return {
    platformRole,
    membershipRole,
    isSuperAdmin: platformRole === "super_admin",
    isPlatformAdmin: platformRole === "platform_admin",
    isOrgAdmin: membershipRole === "owner" || membershipRole === "admin",
  }
}

const resolveDashboardContent = (role: DashboardRoleContext): DashboardContent => {
  if (role.isSuperAdmin) {
    return {
      overviewMetrics: [
        { label: "Active organizations", value: "42", helper: "+3 this week" },
        { label: "Pending invitations", value: "18", helper: "6 sent today" },
        { label: "Platform MRR", value: "$24.5k", helper: "+8.2% month over month" },
        { label: "Global requests", value: "1.2M", helper: "24h across tenants" },
      ],
      quickActions: [
        {
          title: "Review organizations",
          description: "Inspect tenant health and lifecycle status.",
          href: "/dashboard/organizations",
          icon: Building2,
        },
        {
          title: "Create organization",
          description: "Issue onboarding invitation for a new customer.",
          href: "/dashboard/create-organization",
          icon: PlugZap,
        },
        {
          title: "Manage platform users",
          description: "Control admin privileges and account access.",
          href: "/dashboard/platform-users",
          icon: ShieldCheck,
        },
      ],
      activityFeed: [
        {
          title: "Enterprise workspace invited",
          description: "A new onboarding invitation was issued from platform admin tools.",
          timestamp: "7 minutes ago",
        },
        {
          title: "Plan catalog updated",
          description: "Growth plan limits were adjusted for upcoming renewals.",
          timestamp: "34 minutes ago",
        },
        {
          title: "Platform policy changed",
          description: "Security defaults were updated for all new tenants.",
          timestamp: "1 hour ago",
        },
      ],
      welcomeDescription:
        "You are viewing global platform controls for tenant operations and governance.",
    }
  }

  if (role.isPlatformAdmin) {
    return {
      overviewMetrics: [
        { label: "Managed organizations", value: "42", helper: "11 require follow-up" },
        { label: "Global usage today", value: "1.2M", helper: "Across active workspaces" },
        { label: "Audit log events", value: "248", helper: "Last 24 hours" },
        { label: "Escalated incidents", value: "4", helper: "2 resolved" },
      ],
      quickActions: [
        {
          title: "Open organizations",
          description: "Monitor tenant health and account status.",
          href: "/dashboard/organizations",
          icon: Building2,
        },
        {
          title: "View global usage",
          description: "Track platform-wide requests and trends.",
          href: "/dashboard/global-usage",
          icon: BarChart3,
        },
        {
          title: "Inspect logs",
          description: "Review audit and event streams for anomalies.",
          href: "/dashboard/logs",
          icon: SlidersHorizontal,
        },
      ],
      activityFeed: [
        {
          title: "Usage spike detected",
          description: "One tenant exceeded 85% of daily quota and was flagged.",
          timestamp: "12 minutes ago",
        },
        {
          title: "Audit stream exported",
          description: "Security audit logs were exported for compliance reporting.",
          timestamp: "41 minutes ago",
        },
        {
          title: "Organization status updated",
          description: "A suspended tenant was restored after payment confirmation.",
          timestamp: "1 hour ago",
        },
      ],
      welcomeDescription:
        "Your platform admin workspace is scoped to organizations, usage analytics, and logs.",
    }
  }

  if (role.isOrgAdmin) {
    return {
      overviewMetrics: [
        { label: "Active conversations", value: "28", helper: "+6 since yesterday" },
        { label: "Avg response time", value: "1m 42s", helper: "Within SLA target" },
        { label: "Knowledge documents", value: "54", helper: "12 updated this week" },
        { label: "API requests today", value: "14.2k", helper: "68% of daily limit" },
      ],
      quickActions: [
        {
          title: "Open conversation inbox",
          description: "Review unresolved tickets and assign priorities.",
          href: "/dashboard/conversations",
          icon: MessageSquareText,
        },
        {
          title: "Update knowledge base",
          description: "Add FAQs and product updates for better auto-replies.",
          href: "/dashboard/knowledge-base",
          icon: BookOpenCheck,
        },
        {
          title: "Invite users",
          description: "Send invitations for company-admin and staff accounts.",
          href: "/dashboard/users",
          icon: UserPlus,
        },
      ],
      activityFeed: [
        {
          title: "WhatsApp integration synced",
          description: "Webhook latency dropped to 280ms after reconnect.",
          timestamp: "8 minutes ago",
        },
        {
          title: "Knowledge article published",
          description: "Refund policy v2 is now live for AI answers.",
          timestamp: "26 minutes ago",
        },
        {
          title: "API key rotated",
          description: "Legacy key disabled and replaced by owner action.",
          timestamp: "1 hour ago",
        },
      ],
      welcomeDescription:
        "Your onboarding is complete. Use this view as your daily command center.",
    }
  }

  return {
    overviewMetrics: [
      { label: "Assigned conversations", value: "14", helper: "4 waiting for reply" },
      { label: "Avg first response", value: "2m 11s", helper: "Faster than team median" },
      { label: "Knowledge coverage", value: "87%", helper: "Based on tagged tickets" },
      { label: "Resolved today", value: "21", helper: "Personal queue" },
    ],
    quickActions: [
      {
        title: "Open conversation inbox",
        description: "Work assigned tickets and follow-up threads.",
        href: "/dashboard/conversations",
        icon: MessageSquareText,
      },
      {
        title: "Browse knowledge base",
        description: "Find and reuse approved response content.",
        href: "/dashboard/knowledge-base",
        icon: BookOpenCheck,
      },
      {
        title: "Check usage",
        description: "Monitor current request usage and limits.",
        href: "/dashboard/usage",
        icon: BarChart3,
      },
    ],
    activityFeed: [
      {
        title: "Ticket priority updated",
        description: "A conversation was promoted to urgent by your team lead.",
        timestamp: "11 minutes ago",
      },
      {
        title: "Knowledge suggestion approved",
        description: "One of your draft snippets is now available to the team.",
        timestamp: "39 minutes ago",
      },
      {
        title: "Conversation assigned",
        description: "A billing-related thread was routed to your queue.",
        timestamp: "1 hour ago",
      },
    ],
    welcomeDescription:
      "You have operational access for conversations, knowledge, and usage visibility.",
  }
}

export default function DashboardPage() {
  const [storedUser] = useState<StoredUser | null>(() => {
    if (typeof window === "undefined") {
      return null
    }

    const rawUser = localStorage.getItem("user")
    if (!rawUser) {
      return null
    }

    try {
      const parsedUser = JSON.parse(rawUser) as StoredUser
      return {
        fullName: parsedUser.fullName,
        platformRole: parsedUser.platformRole ?? null,
        membershipRole: parsedUser.membershipRole ?? null,
      }
    } catch {
      return null
    }
  })

  const userName = storedUser?.fullName ?? ""
  const roleContext = useMemo(() => resolveRoleContext(storedUser), [storedUser])
  const content = useMemo(() => resolveDashboardContent(roleContext), [roleContext])
  const canManageApiKeys = roleContext.isOrgAdmin

  const [apiKey] = useState(() => {
    if (typeof window === "undefined") {
      return ""
    }

    const rawApiKey = sessionStorage.getItem(oneTimeApiKeyStorageKey)
    if (!rawApiKey) {
      return ""
    }

    sessionStorage.removeItem(oneTimeApiKeyStorageKey)
    return rawApiKey
  })

  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = async () => {
    if (!apiKey) {
      return
    }

    try {
      await navigator.clipboard.writeText(apiKey)
      setIsCopied(true)
    } catch {
      setIsCopied(false)
    }
  }

  const welcomeTitle = useMemo(
    () => (userName ? `Welcome back, ${userName}` : "Welcome back"),
    [userName]
  )

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {content.overviewMetrics.map((metric) => (
          <Card key={metric.label} className="border-border/70 bg-card/95 py-4">
            <CardHeader className="gap-2 px-4 pb-0">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-0">
              <p className="text-xs text-muted-foreground">{metric.helper}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle>{welcomeTitle}</CardTitle>
            <CardDescription>{content.welcomeDescription}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {canManageApiKeys && apiKey ? (
              <>
                <Alert>
                  <KeyRound className="size-4 text-primary" />
                  <AlertTitle>Your API key is shown once</AlertTitle>
                  <AlertDescription>
                    Save this key in your secret manager. It will not be displayed again.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="one-time-api-key">Generated API key</Label>
                  <Input
                    id="one-time-api-key"
                    value={apiKey}
                    readOnly
                    className="font-mono text-xs sm:text-sm"
                  />
                </div>

                <Button type="button" variant="secondary" onClick={handleCopy}>
                  <Copy className="size-4" />
                  {isCopied ? "Copied" : "Copy API key"}
                </Button>
              </>
            ) : canManageApiKeys ? (
              <Alert>
                <CheckCircle2 className="size-4 text-primary" />
                <AlertTitle>Workspace ready</AlertTitle>
                <AlertDescription>
                  No one-time key is pending. Continue managing your support operations.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <ShieldCheck className="size-4 text-primary" />
                <AlertTitle>Limited operational access</AlertTitle>
                <AlertDescription>
                  API key and billing controls are reserved for organization owner/admin roles.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump directly to the most used sections.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-2">
            {content.quickActions.map((action) => (
              <Button
                key={action.href}
                asChild
                variant="outline"
                className="h-auto w-full justify-start gap-3 rounded-xl border-border/70 bg-background/50 px-3 py-3"
              >
                <Link href={action.href}>
                  <action.icon className="size-4 shrink-0 text-primary" />
                  <span className="flex flex-col items-start text-left leading-tight">
                    <span className="text-sm font-medium text-foreground">{action.title}</span>
                    <span className="text-xs text-muted-foreground">{action.description}</span>
                  </span>
                  <ArrowRight className="ml-auto size-4 text-muted-foreground" />
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle>Recent workspace activity</CardTitle>
          <CardDescription>
            This feed is a placeholder for timeline events from conversations, integrations, and security.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
            {content.activityFeed.map((entry) => (
            <div
              key={entry.title}
              className="rounded-lg border border-border/60 bg-background/60 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-sm font-medium text-foreground">{entry.title}</p>
                <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{entry.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
