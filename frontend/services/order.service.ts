import { getStoredToken } from "@/services/auth.service"
import type { Order, ListOrdersQuery, OrderStatus } from "@/types/order"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

type ListOrdersResponse = { data: Order[]; meta: { total: number; limit: number; skip: number } }
type UpdateOrderResponse = { data: Order }

export const listOrders = async (
  query?: ListOrdersQuery
): Promise<ListOrdersResponse> => {
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

  return body as ListOrdersResponse
}

export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus
): Promise<UpdateOrderResponse> => {
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

  return body as UpdateOrderResponse
}
