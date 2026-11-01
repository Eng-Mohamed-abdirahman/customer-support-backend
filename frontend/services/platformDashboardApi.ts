import { getStoredToken } from "@/services/auth.service"
import type { PlatformDashboardData } from "@/types/platform-dashboard"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

type ApiEnvelope<T> = {
  success: boolean
  status?: string
  message: string
  data: T
}

export async function fetchPlatformDashboardAnalytics(): Promise<PlatformDashboardData> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view dashboard analytics")
  }

  const response = await fetch(`${API_BASE_URL}/api/dashboard/platform`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const body = (await response.json().catch(() => null)) as ApiEnvelope<PlatformDashboardData> | null
  const isOk = response.ok && body && body.success !== false && body.status !== "error"

  if (!isOk || !body?.data) {
    throw new Error(body?.message ?? `Failed to retrieve platform dashboard (Status ${response.status})`)
  }

  return body.data
}
