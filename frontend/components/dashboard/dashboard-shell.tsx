"use client"

import { LogOut, Menu, Search, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { type ReactNode, useEffect, useMemo, useState } from "react"

import { getSocket } from "@/lib/socket"
import { listTickets } from "@/services/ticket.service"

import { BrandMark } from "@/components/auth/auth-shell"
import { canAccessDashboardRoute, getDashboardNavGroups } from "@/components/dashboard/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { clearStoredAuth, getCurrentUser, getStoredToken } from "@/services/auth.service"
import type { SafeUser } from "@/types/auth"

type DashboardShellProps = {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [user, setUser] = useState<SafeUser | null>(null)

  useEffect(() => {
    const token = getStoredToken()

    if (!token) {
      clearStoredAuth()
      router.replace("/login")
      return
    }

    getCurrentUser(token)
      .then((currentUser) => {
        setUser(currentUser)
        localStorage.setItem("user", JSON.stringify(currentUser))
        setIsAuthorized(true)
      })
      .catch(() => {
        clearStoredAuth()
        setIsAuthorized(false)
        router.replace("/login")
      })
      .finally(() => {
        setIsCheckingSession(false)
      })
  }, [router])

  useEffect(() => {
    const handleUserUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<SafeUser>

      if (customEvent.detail) {
        setUser(customEvent.detail)
      }
    }

    window.addEventListener("technov:user-updated", handleUserUpdated as EventListener)

    return () => {
      window.removeEventListener("technov:user-updated", handleUserUpdated as EventListener)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }

    const canAccessRoute = canAccessDashboardRoute(
      pathname,
      user.platformRole,
      user.membershipRole,
      user.role
    )

    if (!canAccessRoute) {
      router.replace("/dashboard")
    }
  }, [pathname, router, user])

  const showTicketBadge = isAuthorized && user?.role === "staff"

  const { data: openTicketsCount = 0, refetch: refetchTicketCount } = useQuery({
    queryKey: ["open-tickets-count"],
    queryFn: async () => {
      const result = await listTickets({ limit: 100 })
      return result.tickets.filter((t) => t.status === "open" || t.status === "pending").length
    },
    enabled: showTicketBadge,
    retry: false,
  })

  useEffect(() => {
    if (!showTicketBadge) return

    const token = getStoredToken()
    const socket = getSocket(token)
    if (!socket) return

    const handleTicketUpdate = () => {
      void refetchTicketCount()
    }

    socket.on("ticket:created", handleTicketUpdate)
    socket.on("ticket:updated", handleTicketUpdate)
    socket.on("incoming_handoff_alert", handleTicketUpdate)

    return () => {
      socket.off("ticket:created", handleTicketUpdate)
      socket.off("ticket:updated", handleTicketUpdate)
      socket.off("incoming_handoff_alert", handleTicketUpdate)
    }
  }, [refetchTicketCount, showTicketBadge])

  const navGroups = useMemo(
    () => getDashboardNavGroups(user?.platformRole ?? null, user?.membershipRole ?? null, user?.role),
    [user?.membershipRole, user?.platformRole, user?.role]
  )

  const navItems = useMemo(() => navGroups.flatMap((group) => group.items), [navGroups])

  const activeItem = useMemo(() => {
    return navItems.find((item) => {
      if (item.href === "/dashboard") {
        return pathname === item.href
      }

      return pathname === item.href || pathname.startsWith(`${item.href}/`)
    })
  }, [navItems, pathname])

  const activeTitle =
    activeItem?.title ??
    (pathname === "/dashboard/user-profile" || pathname.startsWith("/dashboard/user-profile/")
      ? "User Profile"
      : "Dashboard")

  const initials = user?.fullName
    ? user.fullName
      .split(" ")
      .map((segment) => segment[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "TN"

  const resolvedInitials = initials || "TN"
  const ROLE_LABELS: Record<string, string> = {
    super_admin: "Platform admin",
    platform_admin: "Platform admin",
    owner: "Company owner",
    admin: "Company admin",
    agent: "Support agent",
    viewer: "Viewer",
  }
  const roleLabel =
    ROLE_LABELS[user?.platformRole ?? ""] ??
    ROLE_LABELS[user?.membershipRole ?? ""] ??
    (user?.role === "staff" ? "Support agent" : "Team member")

  const handleLogout = () => {
    clearStoredAuth()
    router.replace("/login")
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-72 lg:border-r lg:border-sidebar-border lg:bg-sidebar">
          <div className="flex h-full flex-col">
            <div className="border-b border-sidebar-border px-5 py-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6 px-3 py-4">
              {[0, 1].map((groupIndex) => (
                <div key={groupIndex} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <div className="space-y-2">
                    {[0, 1, 2].map((itemIndex) => (
                      <div
                        key={`${groupIndex}-${itemIndex}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                      >
                        <Skeleton className="size-4 rounded" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-2.5 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto border-t border-sidebar-border px-5 py-4">
              <div className="mb-3 flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>
        </div>

        <div className="min-h-screen lg:pl-72">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-2.5">
                <Skeleton className="size-9 rounded-md lg:hidden" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Skeleton className="hidden h-9 w-[320px] rounded-md md:block" />

                <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 sm:flex">
                  <Skeleton className="size-7 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="rounded-2xl border border-border bg-card p-5">
                  <Skeleton className="mb-4 h-3 w-24" />
                  <Skeleton className="mb-2 h-8 w-16" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <div className="rounded-2xl border border-border bg-card p-5">
                <Skeleton className="mb-5 h-5 w-52" />
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((row) => (
                    <div key={row} className="grid grid-cols-[1fr_auto] gap-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <Skeleton className="mb-5 h-5 w-40" />
                <div className="space-y-4">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    )
  }

  if (!isAuthorized || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isMobileNavOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-navy-900/60 lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-sidebar text-sidebar-foreground shadow-e3 transition-transform duration-300 lg:translate-x-0 lg:shadow-none",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col gap-5 px-4 py-5">
          <div className="flex items-center justify-between px-2">
            <Link href="/dashboard" className="rounded-[10px]" aria-label="Technov dashboard">
              <BrandMark inverted />
            </Link>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close menu"
              className="size-11 text-white hover:bg-sidebar-accent hover:text-white lg:hidden"
              onClick={() => setIsMobileNavOpen(false)}
            >
              <X className="size-5" />
            </Button>
          </div>

          <nav aria-label="Workspace navigation" className="flex-1 space-y-5 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-0.5">
                <p className="px-3 pb-1.5 text-xs font-semibold tracking-[0.12em] text-navy-200 uppercase">
                  {group.label}
                </p>

                {group.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`)

                  const isTickets = item.href === "/dashboard/tickets"

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setIsMobileNavOpen(false)}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors",
                        isActive
                          ? "bg-teal-500 font-semibold text-navy-800"
                          : "font-medium text-white hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className="flex-1 truncate">{item.title}</span>
                      {isTickets && user?.role === "staff" && openTicketsCount > 0 && (
                        <span
                          className={cn(
                            "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                            isActive ? "bg-navy-800 text-white" : "bg-mint text-navy-800"
                          )}
                        >
                          {openTicketsCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="mt-auto space-y-2">
            <Link
              href="/dashboard/user-profile"
              className="flex items-center gap-3 rounded-xl bg-sidebar-accent p-3 transition-colors hover:bg-navy-500"
              onClick={() => setIsMobileNavOpen(false)}
            >
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-semibold text-navy-800">
                {resolvedInitials}
                <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-sidebar-accent bg-teal-500" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">{user.fullName}</span>
                <span className="block truncate text-xs text-navy-100">{roleLabel}</span>
              </span>
            </Link>

            <button
              type="button"
              className="flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium text-navy-100 transition-colors hover:bg-sidebar-accent hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="size-5" aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-white">
          <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Open menu"
                className="size-11 border-[1.5px] lg:hidden"
                onClick={() => setIsMobileNavOpen(true)}
              >
                <Menu className="size-5" />
              </Button>

              <p className="truncate font-heading text-lg font-semibold text-navy-800">{activeTitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  readOnly
                  value=""
                  aria-label="Search"
                  placeholder="Search conversations, tickets, contacts"
                  className="h-11 w-[340px] rounded-[10px] border-[1.5px] border-border bg-muted pl-10 text-[15px]"
                />
              </div>

              <span className="hidden rounded-full bg-mint px-3 py-1.5 text-[13px] font-semibold text-navy-800 lg:inline-flex">
                AI agent online
              </span>

              <Link
                href="/dashboard/user-profile"
                aria-label="Your profile"
                className="flex size-11 items-center justify-center rounded-full bg-mint text-sm font-semibold text-navy-800 transition-colors hover:bg-teal-200 sm:hidden"
              >
                {resolvedInitials}
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
