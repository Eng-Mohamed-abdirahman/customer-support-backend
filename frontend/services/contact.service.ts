import { getStoredToken } from "@/services/auth.service"
import type {
  ContactListResult,
  ContactRecord,
  CreateContactInput,
  UpdateContactInput,
} from "@/types/contact"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

export async function listContacts(params?: {
  search?: string
  limit?: number
  skip?: number
}): Promise<ContactListResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view contacts")
  }

  const searchParams = new URLSearchParams()
  if (params?.search) {
    searchParams.set("search", params.search)
  }
  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit))
  }
  if (typeof params?.skip === "number") {
    searchParams.set("skip", String(params.skip))
  }

  const response = await fetch(
    `${API_BASE_URL}/api/contacts${searchParams.size ? `?${searchParams}` : ""}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  const body = (await response.json().catch(() => null)) as ApiEnvelope<ContactListResult> | null

  if (!response.ok || body?.success === false || !body?.data) {
    throw new Error(body?.message ?? "Failed to load contacts.")
  }

  return body.data
}

export async function getContactByPhone(phone: string): Promise<ContactRecord | null> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view contact details")
  }

  const encodedPhone = encodeURIComponent(phone.replace(/^\+/, ""))

  const response = await fetch(`${API_BASE_URL}/api/contacts/by-phone/${encodedPhone}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  })

  if (response.status === 404) {
    return null
  }

  const body = (await response.json().catch(() => null)) as ApiEnvelope<{ contact: ContactRecord }> | null

  if (!response.ok || body?.success === false || !body?.data?.contact) {
    throw new Error(body?.message ?? "Failed to load contact.")
  }

  return body.data.contact
}

export async function createContact(input: CreateContactInput): Promise<ContactRecord> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to add contacts")
  }

  const response = await fetch(`${API_BASE_URL}/api/contacts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  const body = (await response.json().catch(() => null)) as ApiEnvelope<{ contact: ContactRecord }> | null

  if (!response.ok || body?.success === false || !body?.data?.contact) {
    throw new Error(body?.message ?? "Failed to create contact.")
  }

  return body.data.contact
}

export async function updateContact(
  contactId: string,
  input: UpdateContactInput
): Promise<ContactRecord> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to update contacts")
  }

  const response = await fetch(`${API_BASE_URL}/api/contacts/${encodeURIComponent(contactId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  const body = (await response.json().catch(() => null)) as ApiEnvelope<{ contact: ContactRecord }> | null

  if (!response.ok || body?.success === false || !body?.data?.contact) {
    throw new Error(body?.message ?? "Failed to update contact.")
  }

  return body.data.contact
}

export async function deleteContact(contactId: string): Promise<void> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to delete contacts")
  }

  const response = await fetch(`${API_BASE_URL}/api/contacts/${encodeURIComponent(contactId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })

  const body = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null

  if (!response.ok || body?.success === false) {
    throw new Error(body?.message ?? "Failed to delete contact.")
  }
}
