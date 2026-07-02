import { getStoredToken } from "@/services/auth.service"
import type {
  AssignPlanInput,
  CreatePlanInput,
  PlanDashboardStats,
  PlanDetailResult,
  PlanListResult,
  PlanOrganizationsResult,
  PlanStatus,
  SubscriptionPlan,
} from "@/types/plan"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

type ApiBody<T> = {
  success?: boolean
  message?: string
  data?: T
}

async function extractData<T>(response: Response, fallbackErrorMessage: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as ApiBody<T> | null

  if (!response.ok) {
    throw new Error(body?.message ?? fallbackErrorMessage)
  }

  if (body?.data === undefined || body?.data === null) {
    throw new Error("Unexpected API response")
  }

  return body.data
}

function authHeaders(): HeadersInit {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to manage plans")
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

export async function listPlans(params?: {
  search?: string
  status?: PlanStatus
  page?: number
  limit?: number
}): Promise<PlanListResult> {
  const query = new URLSearchParams()
  if (params?.search) query.set("search", params.search)
  if (params?.status) query.set("status", params.status)
  if (params?.page) query.set("page", String(params.page))
  if (params?.limit) query.set("limit", String(params.limit))

  const suffix = query.toString() ? `?${query.toString()}` : ""
  const response = await fetch(`${API_BASE_URL}/api/plans${suffix}`, {
    headers: authHeaders(),
  })

  return extractData<PlanListResult>(response, "Failed to load plans")
}

export async function getPlanDashboardStats(): Promise<PlanDashboardStats> {
  const response = await fetch(`${API_BASE_URL}/api/plans/stats/overview`, {
    headers: authHeaders(),
  })

  return extractData<PlanDashboardStats>(response, "Failed to load plan statistics")
}

export async function getPlan(planId: string): Promise<PlanDetailResult> {
  const response = await fetch(`${API_BASE_URL}/api/plans/${encodeURIComponent(planId)}`, {
    headers: authHeaders(),
  })

  return extractData<PlanDetailResult>(response, "Failed to load plan")
}

export async function createPlan(payload: CreatePlanInput): Promise<{ plan: SubscriptionPlan }> {
  const response = await fetch(`${API_BASE_URL}/api/plans`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return extractData<{ plan: SubscriptionPlan }>(response, "Failed to create plan")
}

export async function updatePlan(
  planId: string,
  payload: Partial<CreatePlanInput>
): Promise<{ plan: SubscriptionPlan }> {
  const response = await fetch(`${API_BASE_URL}/api/plans/${encodeURIComponent(planId)}`, {
    method: "PUT",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return extractData<{ plan: SubscriptionPlan }>(response, "Failed to update plan")
}

export async function deletePlan(planId: string): Promise<{ deleted: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/plans/${encodeURIComponent(planId)}`, {
    method: "DELETE",
    headers: authHeaders(),
  })

  return extractData<{ deleted: boolean }>(response, "Failed to delete plan")
}

export async function duplicatePlan(planId: string): Promise<{ plan: SubscriptionPlan }> {
  const response = await fetch(
    `${API_BASE_URL}/api/plans/${encodeURIComponent(planId)}/duplicate`,
    {
      method: "POST",
      headers: authHeaders(),
    }
  )

  return extractData<{ plan: SubscriptionPlan }>(response, "Failed to duplicate plan")
}

export async function updatePlanStatus(
  planId: string,
  status: PlanStatus
): Promise<{ plan: SubscriptionPlan }> {
  const response = await fetch(
    `${API_BASE_URL}/api/plans/${encodeURIComponent(planId)}/status`,
    {
      method: "PATCH",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  )

  return extractData<{ plan: SubscriptionPlan }>(response, "Failed to update plan status")
}

export async function getPlanOrganizations(
  planId: string,
  params?: { page?: number; limit?: number; search?: string }
): Promise<PlanOrganizationsResult> {
  const query = new URLSearchParams()
  if (params?.page) query.set("page", String(params.page))
  if (params?.limit) query.set("limit", String(params.limit))
  if (params?.search) query.set("search", params.search)

  const suffix = query.toString() ? `?${query.toString()}` : ""
  const response = await fetch(
    `${API_BASE_URL}/api/plans/${encodeURIComponent(planId)}/organizations${suffix}`,
    { headers: authHeaders() }
  )

  return extractData<PlanOrganizationsResult>(response, "Failed to load plan organizations")
}

export async function assignPlanToOrganization(
  organizationId: string,
  payload: AssignPlanInput
): Promise<unknown> {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${encodeURIComponent(organizationId)}/assign-plan`,
    {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  return extractData(response, "Failed to assign plan")
}

export async function changeOrganizationPlan(
  organizationId: string,
  payload: AssignPlanInput
): Promise<unknown> {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${encodeURIComponent(organizationId)}/change-plan`,
    {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  return extractData(response, "Failed to change plan")
}

export async function removePlanFromOrganization(organizationId: string): Promise<unknown> {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${encodeURIComponent(organizationId)}/remove-plan`,
    {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  )

  return extractData(response, "Failed to remove plan")
}
