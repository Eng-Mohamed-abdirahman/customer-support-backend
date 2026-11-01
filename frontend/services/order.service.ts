import { getStoredToken } from "@/services/auth.service"
import type { Order, ListOrdersQuery, OrderStatus } from "@/types/order"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

async function extractData<T>(response: Response, fallbackErrorMessage: string): Promise<T> {
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.message ?? fallbackErrorMessage)
  }

  if (!body?.data) {
    throw new Error("Unexpected API response")
  }

  return body as T
}

export const listOrders = async (
  query?: ListOrdersQuery
): Promise<{ data: Order[]; meta: { total: number; limit: number; skip: number } }> => {
  const token = getStoredToken()
  if (!token) throw new Error("Please sign in")

  const params = new URLSearchParams()
  if (query?.status) params.append("status", query.status)
  if (query?.limit) params.append("limit", query.limit.toString())
  if (query?.skip) params.append("skip", query.skip.toString())

  const response = await fetch(`${API_BASE_URL}/api/orders?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.message ?? "Failed to list orders")
  
  return body as any
}

export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus
): Promise<{ data: Order }> => {
  const token = getStoredToken()
  if (!token) throw new Error("Please sign in")

  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.message ?? "Failed to update order status")
  
  return body as any
}
