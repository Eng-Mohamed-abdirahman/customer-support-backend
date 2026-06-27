"use client"

import { LogOut, Menu, Search, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react"

import { getSocket } from "@/lib/socket"
import { listTickets } from "@/services/ticket.service"

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

  const [openTicketsCount, setOpenTicketsCount] = useState(0)

  const loadTicketCount = useCallback(async () => {
    try {
      const result = await listTickets({ limit: 100 })
      const activeTickets = result.tickets.filter(
        (t) => t.status === "open" || t.status === "pending"
      )
      setOpenTicketsCount(activeTickets.length)
    } catch {
      // Ignore background fetch errors
    }
  }, [])

  useEffect(() => {
    if (!isAuthorized) return

    void loadTicketCount()

    const token = getStoredToken()
    const socket = getSocket(token)
    if (!socket) return

    const handleTicketUpdate = () => {
      void loadTicketCount()
    }

    socket.on("ticket:created", handleTicketUpdate)
    socket.on("ticket:updated", handleTicketUpdate)
    socket.on("incoming_handoff_alert", handleTicketUpdate)

    return () => {
      socket.off("ticket:created", handleTicketUpdate)
      socket.off("ticket:updated", handleTicketUpdate)
      socket.off("incoming_handoff_alert", handleTicketUpdate)
    }
  }, [isAuthorized, loadTicketCount])

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
  const roleLabel = user?.platformRole
    ? user.platformRole
    : user?.membershipRole
      ? `organization_${user.membershipRole}`
      : "organization_member"

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
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-300 lg:translate-x-0",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-sm font-semibold text-primary">
              T
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Technov</p>
              <p className="text-base font-semibold text-sidebar-foreground">Control Center</p>
            </div>
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
            onClick={() => setIsMobileNavOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-6 space-y-2">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`)

                  const isTickets = item.href === "/dashboard/tickets"

                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant="ghost"
                      className={cn(
                        "h-auto w-full justify-start gap-3 rounded-xl px-3 py-2.5",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Link href={item.href} className="flex w-full items-center gap-3">
                        <item.icon className="size-4 shrink-0" />
                        <span className="text-sm font-medium">{item.title}</span>
                        {isTickets && openTicketsCount > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/30 px-1.5 text-[10px] font-bold text-rose-400">
                            {openTicketsCount}
                          </span>
                        )}
                      </Link>
                    </Button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border px-5 py-4 mt-auto">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">
              {resolvedInitials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 border-sidebar-border bg-transparent text-muted-foreground hover:bg-sidebar-accent"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setIsMobileNavOpen(true)}
              >
                <Menu className="size-4" />
              </Button>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {activeTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  readOnly
                  value=""
                  placeholder="Search conversations, docs, and settings"
                  className="h-9 w-[320px] border-border bg-background pl-8"
                />
              </div>

              <Link
                href="/dashboard/user-profile"
                className="hidden items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 transition-colors hover:bg-muted sm:flex"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {resolvedInitials}
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-foreground">{user.fullName}</p>
                  <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
                </div>
              </Link>
            </div>
          </div>
        </header>

        <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
