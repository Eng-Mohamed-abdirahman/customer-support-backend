import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Blocks,
  Building2,
  CreditCard,
  Gauge,
  Globe,
  KeyRound,
  LayoutDashboard,
  MessageSquareText,
  Ticket,
  ShoppingCart,
  Puzzle,
  ReceiptText,
  Settings,
  Shield,
  SlidersHorizontal,
  UserCog,
  UserPlus,
  Users,
  ContactRound,
  Palette,
  Sparkles,
  History,
} from "lucide-react"

import type { MembershipRole, SafeUser } from "@/types/auth"

type PlatformRole = NonNullable<SafeUser["platformRole"]>

type RouteAccess = {
  platformRoles?: PlatformRole[]
  membershipRoles?: MembershipRole[]
}

export type DashboardNavItem = {
  title: string
  href: string
  icon: LucideIcon
  description: string
  access?: RouteAccess
}

export type DashboardNavGroup = {
  label: string
  items: DashboardNavItem[]
}

const organizationRoles: MembershipRole[] = ["owner", "admin", "agent", "viewer"]
const organizationAdminRoles: MembershipRole[] = ["owner", "admin"]
const platformLimitedRoles: PlatformRole[] = ["super_admin", "platform_admin"]
const superAdminOnlyRoles: PlatformRole[] = ["super_admin"]

const hasAccess = (
  access: RouteAccess | undefined,
  platformRole: SafeUser["platformRole"],
  membershipRole: SafeUser["membershipRole"]
) => {
  if (!access) {
    return true
  }

  const hasPlatformRule = Boolean(access.platformRoles?.length)
  const hasMembershipRule = Boolean(access.membershipRoles?.length)

  if (!hasPlatformRule && !hasMembershipRule) {
    return true
  }

  const platformAllowed =
    hasPlatformRule && platformRole
      ? access.platformRoles?.includes(platformRole as PlatformRole)
      : false

  const membershipAllowed =
    hasMembershipRule && membershipRole
      ? access.membershipRoles?.includes(membershipRole)
      : false

  return Boolean(platformAllowed || membershipAllowed)
}

const generalNavItems: DashboardNavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Workspace overview",
    access: {},
  },
  {
    title: "Organization Brand",
    href: "/dashboard/brand",
    icon: Palette,
    description: "Configure organization brand guidelines",
    access: { membershipRoles: organizationAdminRoles },
  },
  {
    title: "Studio Canvas",
    href: "/dashboard/studio",
    icon: Sparkles,
    description: "Create marketing graphic designs with AI",
    access: { membershipRoles: organizationAdminRoles },
  },
  {
    title: "Design History",
    href: "/dashboard/studio/history",
    icon: History,
    description: "Browse past AI-generated designs",
    access: { membershipRoles: organizationAdminRoles },
  },
  {
    title: "Inbox",
    href: "/dashboard/inbox",
    icon: MessageSquareText,
    description: "WhatsApp inbox and live threads",
    access: { membershipRoles: organizationRoles },
  },
  {
    title: "Conversations",
    href: "/dashboard/conversations",
    icon: Globe,
    description: "Website chat conversations",
    access: { membershipRoles: organizationRoles },
  },
  {
    title: "Contacts",
    href: "/dashboard/contacts",
    icon: ContactRound,
    description: "Customer contact list",
    access: { membershipRoles: organizationRoles },
  },
  {
    title: "Tickets",
    href: "/dashboard/tickets",
    icon: Ticket,
    description: "Human handoff requests",
    access: { membershipRoles: organizationAdminRoles },
  },
  {
    title: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    description: "AI generated orders",
    access: { membershipRoles: organizationAdminRoles },
  },
  {
    title: "Knowledge Base",
    href: "/dashboard/knowledge-base",
    icon: Blocks,
    description: "Training content",
    access: { membershipRoles: organizationRoles },
  },
  {
    title: "Integrations",
    href: "/dashboard/integrations",
    icon: Puzzle,
    description: "Channels and tools",
    access: { membershipRoles: organizationAdminRoles },
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: UserPlus,
    description: "Invite and manage team",
    access: { membershipRoles: organizationAdminRoles },
  },
  {
    title: "Company Profile",
    href: "/dashboard/company-profile",
    icon: Building2,
    description: "Organization information",
    access: { membershipRoles: organizationAdminRoles },
  },
  {
    title: "User Profile",
    href: "/dashboard/user-profile",
    icon: UserCog,
    description: "Personal account details",
    access: { membershipRoles: organizationRoles },
  },
  {
    title: "API Keys",
    href: "/dashboard/api-keys",
    icon: KeyRound,
    description: "Secure credentials",
    access: { membershipRoles: organizationAdminRoles },
  },
  {
    title: "Usage",
    href: "/dashboard/usage",
    icon: Gauge,
    description: "Requests and limits",
    access: { membershipRoles: organizationRoles },
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
    description: "Plans and invoices",
    access: { membershipRoles: organizationAdminRoles },
  },
  // {
  //   title: "Settings",
  //   href: "/dashboard/settings",
  //   icon: Settings,
  //   description: "Workspace preferences",
  //   access: { membershipRoles: organizationAdminRoles },
  // },
]

const platformNavItems: DashboardNavItem[] = [
  {
    title: "Organizations",
    href: "/dashboard/organizations",
    icon: Building2,
    description: "Tenant management",
    access: { platformRoles: platformLimitedRoles },
  },
  {
    title: "Platform Users",
    href: "/dashboard/platform-users",
    icon: Users,
    description: "Admins and access",
    access: { platformRoles: superAdminOnlyRoles },
  },
  {
    title: "Plans",
    href: "/dashboard/plans",
    icon: ReceiptText,
    description: "Subscription packages",
    access: { platformRoles: superAdminOnlyRoles },
  },
  {
    title: "Subscriptions",
    href: "/dashboard/subscriptions",
    icon: UserCog,
    description: "Customer plan status",
    access: { platformRoles: superAdminOnlyRoles },
  },
  {
    title: "Global Usage",
    href: "/dashboard/global-usage",
    icon: BarChart3,
    description: "Cross-tenant analytics",
    access: { platformRoles: platformLimitedRoles },
  },
  {
    title: "Logs",
    href: "/dashboard/logs",
    icon: SlidersHorizontal,
    description: "Audit and events",
    access: { platformRoles: platformLimitedRoles },
  },
  {
    title: "Platform Settings",
    href: "/dashboard/platform-settings",
    icon: Shield,
    description: "Core controls",
    access: { platformRoles: superAdminOnlyRoles },
  },
]

const allNavItemsBySpecificity = [...generalNavItems, ...platformNavItems].sort(
  (a, b) => b.href.length - a.href.length
)

export function getDashboardNavGroups(
  platformRole: SafeUser["platformRole"],
  membershipRole: SafeUser["membershipRole"]
): DashboardNavGroup[] {
  const visibleGeneralItems = generalNavItems.filter((item) =>
    hasAccess(item.access, platformRole, membershipRole)
  )
  const visiblePlatformItems = platformNavItems.filter((item) =>
    hasAccess(item.access, platformRole, membershipRole)
  )

  const groups: DashboardNavGroup[] = []

  if (visibleGeneralItems.length > 0) {
    groups.push({ label: "General", items: visibleGeneralItems })
  }

  if (visiblePlatformItems.length > 0) {
    groups.push({ label: "Platform", items: visiblePlatformItems })
  }

  return groups
}

export function canAccessDashboardRoute(
  pathname: string,
  platformRole: SafeUser["platformRole"],
  membershipRole: SafeUser["membershipRole"]
) {
  if (pathname === "/dashboard") {
    return true
  }

  if (!pathname.startsWith("/dashboard")) {
    return true
  }

  const matchedItem = allNavItemsBySpecificity.find((item) => {
    if (pathname === item.href) {
      return true
    }

    return pathname.startsWith(`${item.href}/`)
  })

  if (!matchedItem) {
    return true
  }

  return hasAccess(matchedItem.access, platformRole, membershipRole)
}
