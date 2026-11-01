import type {
  ApiEnvelope,
  AcceptInvitationPayload,
  AcceptInvitationResult,
  CreateInvitationPayload,
  CreateInvitationResult,
} from "@/types/invitation"
import { getStoredToken } from "@/services/auth.service"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

async function extractData<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok) {
    const message = payload?.message ?? "Request failed. Please try again."
    throw new Error(message)
  }

  if (!payload?.data) {
    throw new Error("Unexpected API response")
  }

  return payload.data
}

export async function createInvitation(
  payload: CreateInvitationPayload
): Promise<CreateInvitationResult> {
  const token = getStoredToken()

  if (!token) {
    throw new Error("Please sign in to send invitations")
  }

  const response = await fetch(`${API_BASE_URL}/api/invitations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  return extractData<CreateInvitationResult>(response)
}

export async function acceptInvitation(
  payload: AcceptInvitationPayload
): Promise<AcceptInvitationResult> {
  const response = await fetch(`${API_BASE_URL}/api/invitations/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  return extractData<AcceptInvitationResult>(response)
}
