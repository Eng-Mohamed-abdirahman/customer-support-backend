import { getStoredToken } from "@/services/auth.service"
import type { DashboardApiResponseData } from "@/types/dashboard"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
  status?: string
}

export async function fetchDashboardAnalytics(range: string = "7d"): Promise<DashboardApiResponseData> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view dashboard analytics")
  }

  const response = await fetch(`${API_BASE_URL}/api/dashboard/company?range=${range}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  // Parse API envelope
  const body = (await response.json().catch(() => null)) as ApiEnvelope<DashboardApiResponseData> | null

  // In express, success key might not be in response, checking ok status and status key
  const isOk = response.ok && body && (body.success !== false && body.status !== "error")

  if (!isOk || !body?.data) {
    throw new Error(body?.message ?? `Failed to retrieve dashboard stats (Status ${response.status})`)
  }

  return body.data
}
