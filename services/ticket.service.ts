import { getStoredToken } from "@/services/auth.service"
import type { CreateTicketInput, CreateTicketResult, TicketListResult } from "@/types/ticket"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

export async function createTicket(input: CreateTicketInput): Promise<CreateTicketResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to create tickets")
  }

  const response = await fetch(`${API_BASE_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  const body = (await response.json().catch(() => null)) as ApiEnvelope<CreateTicketResult> | null

  if (!response.ok || body?.success === false || !body?.data) {
    throw new Error(body?.message ?? "Failed to create ticket.")
  }

  return body.data
}

export async function listTickets(params?: {
  status?: string
  limit?: number
  skip?: number
}): Promise<TicketListResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view tickets")
  }

  const searchParams = new URLSearchParams()
  if (params?.status) {
    searchParams.set("status", params.status)
  }
  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit))
  }
  if (typeof params?.skip === "number") {
    searchParams.set("skip", String(params.skip))
  }

  const response = await fetch(
    `${API_BASE_URL}/api/tickets${searchParams.size ? `?${searchParams}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const body = (await response.json().catch(() => null)) as ApiEnvelope<TicketListResult> | null

  if (!response.ok || body?.success === false || !body?.data) {
    throw new Error(body?.message ?? "Failed to load tickets.")
  }

  return body.data
}
