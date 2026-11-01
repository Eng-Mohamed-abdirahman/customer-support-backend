import { getStoredToken } from "@/services/auth.service"
import type { StaffDashboardData } from "@/types/staff-dashboard"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

type ApiEnvelope<T> = {
  success: boolean
  status?: string
  message: string
  data: T
}

export async function fetchStaffDashboardAnalytics(): Promise<StaffDashboardData> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view dashboard analytics")
  }

  const response = await fetch(`${API_BASE_URL}/api/dashboard/staff`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const body = (await response.json().catch(() => null)) as ApiEnvelope<StaffDashboardData> | null
  const isOk = response.ok && body && (body.success !== false && body.status !== "error")

  if (!isOk || !body?.data) {
    throw new Error(body?.message ?? `Failed to retrieve staff dashboard (Status ${response.status})`)
  }

  return body.data
}
