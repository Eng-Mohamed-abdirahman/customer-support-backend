import { getStoredToken } from "@/services/auth.service"
import type {
  ConnectWhatsAppInput,
  EmbeddedSignupResult,
  WhatsAppConnectResult,
  WhatsAppDisconnectResult,
  WhatsAppStatusResult,
} from "@/types/whatsapp"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

async function extractData<T>(response: Response, fallbackErrorMessage: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok) {
    throw new Error(body?.message ?? fallbackErrorMessage)
  }

  if (!body?.data) {
    throw new Error("Unexpected API response")
  }

  return body.data
}

export async function getWhatsAppStatus(organizationId?: string): Promise<WhatsAppStatusResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view WhatsApp settings")
  }

  const searchParams = new URLSearchParams()
  if (organizationId) {
    searchParams.set("organizationId", organizationId)
  }

  const response = await fetch(
    `${API_BASE_URL}/api/whatsapp/status${searchParams.size ? `?${searchParams}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(organizationId ? { "x-organization-id": organizationId } : {}),
      },
    }
  )

  return extractData<WhatsAppStatusResult>(
    response,
    "Failed to fetch WhatsApp connection status"
  )
}

export async function connectWhatsApp(
  payload: ConnectWhatsAppInput,
  organizationId?: string
): Promise<WhatsAppConnectResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to connect WhatsApp")
  }

  const searchParams = new URLSearchParams()
  if (organizationId) {
    searchParams.set("organizationId", organizationId)
  }

  const response = await fetch(
    `${API_BASE_URL}/api/whatsapp/connect${searchParams.size ? `?${searchParams}` : ""}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(organizationId ? { "x-organization-id": organizationId } : {}),
      },
      body: JSON.stringify(payload),
    }
  )

  return extractData<WhatsAppConnectResult>(
    response,
    "Failed to connect WhatsApp. Please check credentials and try again."
  )
}

export async function completeEmbeddedSignup(
  payload: {
    code: string
    redirectUri: string
  },
  organizationId?: string
): Promise<EmbeddedSignupResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to connect WhatsApp")
  }

  const searchParams = new URLSearchParams()
  if (organizationId) {
    searchParams.set("organizationId", organizationId)
  }

  const response = await fetch(
    `${API_BASE_URL}/api/whatsapp/embedded-signup/complete${searchParams.size ? `?${searchParams}` : ""}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(organizationId ? { "x-organization-id": organizationId } : {}),
      },
      body: JSON.stringify(payload),
    }
  )

  return extractData<EmbeddedSignupResult>(
    response,
    "Failed to complete WhatsApp Embedded Signup"
  )
}

export async function disconnectWhatsApp(
  phoneNumberId: string,
  organizationId?: string
): Promise<WhatsAppDisconnectResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to disconnect WhatsApp")
  }

  const searchParams = new URLSearchParams()
  if (organizationId) {
    searchParams.set("organizationId", organizationId)
  }

  const response = await fetch(
    `${API_BASE_URL}/api/whatsapp/disconnect/${encodeURIComponent(phoneNumberId)}${searchParams.size ? `?${searchParams}` : ""}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(organizationId ? { "x-organization-id": organizationId } : {}),
      },
    }
  )

  return extractData<WhatsAppDisconnectResult>(
    response,
    "Failed to disconnect WhatsApp"
  )
}
