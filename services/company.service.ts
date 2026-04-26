import type { ApiEnvelope } from "@/types/invitation"
import type {
  CreateCompanyInput,
  CreateCompanyResult,
  MyCompanyUsersResult,
  OrganizationAdminSettingsResult,
  OrganizationWithUsers,
  UpdateCompanyProfileInput,
  UpdateCompanyProfileResult,
  UpdateOrganizationAdminSettingsInput,
} from "@/types/company"
import { getStoredToken } from "@/services/auth.service"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

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

export async function createCompany(payload: CreateCompanyInput): Promise<CreateCompanyResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to manage companies")
  }

  const response = await fetch(`${API_BASE_URL}/api/organizations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
    }),
  })

  return extractData<CreateCompanyResult>(
    response,
    "Failed to create company. Please try again."
  )
}

export async function listOrganizations(): Promise<OrganizationWithUsers[]> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view companies")
  }

  const response = await fetch(`${API_BASE_URL}/api/organizations`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return extractData<OrganizationWithUsers[]>(
    response,
    "Failed to load companies. Please try again."
  )
}

export async function createOrganizationInvitation(payload: CreateCompanyInput): Promise<string> {
  const result = await createCompany(payload)

  return `Company ${result.organization.name} created and invitation sent to ${result.invitation.email}.`
}

export const createCompanyInvitation = createOrganizationInvitation

export async function listMyCompanyUsers(): Promise<MyCompanyUsersResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view users")
  }

  const response = await fetch(`${API_BASE_URL}/api/organizations/my-users`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return extractData<MyCompanyUsersResult>(
    response,
    "Failed to load company users. Please try again."
  )
}

export async function updateMyCompanyProfile(
  payload: UpdateCompanyProfileInput
): Promise<UpdateCompanyProfileResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to update company profile")
  }

  const response = await fetch(`${API_BASE_URL}/api/organizations/my-profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  return extractData<UpdateCompanyProfileResult>(
    response,
    "Failed to update company profile. Please try again."
  )
}

export async function getOrganizationAdminSettings(
  organizationId: string
): Promise<OrganizationAdminSettingsResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view organization settings")
  }

  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${encodeURIComponent(organizationId)}/admin-settings`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return extractData<OrganizationAdminSettingsResult>(
    response,
    "Failed to load organization settings. Please try again."
  )
}

export async function updateOrganizationAdminSettings(
  organizationId: string,
  payload: UpdateOrganizationAdminSettingsInput
): Promise<OrganizationAdminSettingsResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to update organization settings")
  }

  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${encodeURIComponent(organizationId)}/admin-settings`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  )

  return extractData<OrganizationAdminSettingsResult>(
    response,
    "Failed to update organization settings. Please try again."
  )
}