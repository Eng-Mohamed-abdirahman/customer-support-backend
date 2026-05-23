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

export async function getWhatsAppStatus(): Promise<WhatsAppStatusResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view WhatsApp settings")
  }

  const response = await fetch(`${API_BASE_URL}/api/whatsapp/status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return extractData<WhatsAppStatusResult>(
    response,
    "Failed to fetch WhatsApp connection status"
  )
}

export async function connectWhatsApp(
  payload: ConnectWhatsAppInput
): Promise<WhatsAppConnectResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to connect WhatsApp")
  }

  const response = await fetch(`${API_BASE_URL}/api/whatsapp/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  return extractData<WhatsAppConnectResult>(
    response,
    "Failed to connect WhatsApp. Please check credentials and try again."
  )
}

export async function completeEmbeddedSignup(payload: {
  code: string
  redirectUri: string
}): Promise<EmbeddedSignupResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to connect WhatsApp")
  }

  const response = await fetch(`${API_BASE_URL}/api/whatsapp/embedded-signup/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  return extractData<EmbeddedSignupResult>(
    response,
    "Failed to complete WhatsApp Embedded Signup"
  )
}

export async function disconnectWhatsApp(
  phoneNumberId: string
): Promise<WhatsAppDisconnectResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to disconnect WhatsApp")
  }

  const response = await fetch(
    `${API_BASE_URL}/api/whatsapp/disconnect/${encodeURIComponent(phoneNumberId)}`,
    {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    }
  )

  return extractData<WhatsAppDisconnectResult>(
    response,
    "Failed to disconnect WhatsApp"
  )
}
