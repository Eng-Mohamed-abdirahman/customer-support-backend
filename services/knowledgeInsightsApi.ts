import { getStoredToken } from "@/services/auth.service"
import type { KnowledgeInsightsData } from "@/types/knowledge-insights"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

export async function fetchKnowledgeInsights(range: string = "7d"): Promise<KnowledgeInsightsData> {
  const token = getStoredToken()
  if (!token) throw new Error("Please sign in to view knowledge insights")

  const response = await fetch(`${API_BASE_URL}/api/knowledge/insights?range=${range}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  })

  const body = await response.json().catch(() => null)
  const isOk = response.ok && body?.success !== false

  if (!isOk || !body?.data) {
    throw new Error(body?.message ?? `Failed to fetch knowledge insights (${response.status})`)
  }

  return body.data as KnowledgeInsightsData
}
