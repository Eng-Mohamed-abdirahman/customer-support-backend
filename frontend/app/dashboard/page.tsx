"use client"

import { useEffect, useState } from "react"

import CompanyAdminDashboard from "@/components/dashboard/views/company-admin-dashboard"
import PlatformAdminDashboard from "@/components/dashboard/views/platform-admin-dashboard"
import StaffDashboard from "@/components/dashboard/views/staff-dashboard"
import { getCurrentUser, getStoredToken } from "@/services/auth.service"
import type { SafeUser } from "@/types/auth"

export default function DashboardPage() {
  const [user, setUser] = useState<SafeUser | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadUser = async () => {
      try {
        const token = getStoredToken()
        if (!token) {
          return
        }

        const me = await getCurrentUser(token)
        if (isMounted) {
          setUser(me)
        }
      } finally {
        if (isMounted) {
          setIsLoadingUser(false)
        }
      }
    }

    void loadUser()

    return () => {
      isMounted = false
    }
  }, [])

  if (isLoadingUser) {
    return <div className="h-40 animate-pulse rounded-2xl border border-border/70 bg-muted/30" />
  }

  if (user?.role === "staff") {
    return <StaffDashboard />
  }

  if (user?.role === "admin") {
    return <PlatformAdminDashboard />
  }

  return <CompanyAdminDashboard />
}
