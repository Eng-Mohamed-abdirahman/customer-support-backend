import type { ApiEnvelope } from "@/types/invitation"
import type {
  CreateCompanyInput,
  CreateCompanyResult,
  CreateCompanyApiKeyInput,
  CreateCompanyApiKeyResult,
  CompanyApiKeyRecord,
  ListCompanyApiKeysResult,
  MyCompanyApiKeySettingsResult,
  MyCompanyUsageResult,
  GlobalOrganizationUsageRow,
  MyCompanyUsersResult,
  OrganizationAdminSettingsResult,
  RevokeCompanyApiKeyResult,
  RotateCompanyApiKeyResult,
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

export async function getMyCompanyApiKeySettings(): Promise<MyCompanyApiKeySettingsResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view API settings")
  }

  const response = await fetch(`${API_BASE_URL}/api/organizations/my-api-key`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return extractData<MyCompanyApiKeySettingsResult>(
    response,
    "Failed to load API key settings. Please try again."
  )
}

export async function getMyCompanyUsage(): Promise<MyCompanyUsageResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view usage")
  }

  const response = await fetch(`${API_BASE_URL}/api/organizations/my-usage`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return extractData<MyCompanyUsageResult>(
    response,
    "Failed to load usage. Please try again."
  )
}

export async function listOrganizationsUsage(): Promise<GlobalOrganizationUsageRow[]> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view global usage")
  }

  const response = await fetch(`${API_BASE_URL}/api/organizations/usage`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return extractData<GlobalOrganizationUsageRow[]>(
    response,
    "Failed to load global usage. Please try again."
  )
}

export async function rotateMyCompanyApiKey(): Promise<RotateCompanyApiKeyResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to rotate the API key")
  }

  const response = await fetch(`${API_BASE_URL}/api/organizations/my-api-key/rotate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return extractData<RotateCompanyApiKeyResult>(
    response,
    "Failed to rotate API key. Please try again."
  )
}

export async function listMyCompanyApiKeys(): Promise<ListCompanyApiKeysResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view API keys")
  }

  const response = await fetch(`${API_BASE_URL}/api/organizations/my-api-keys`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return extractData<ListCompanyApiKeysResult>(
    response,
    "Failed to load API keys. Please try again."
  )
}

export async function createMyCompanyApiKey(
  payload: CreateCompanyApiKeyInput
): Promise<CreateCompanyApiKeyResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to create an API key")
  }

  const response = await fetch(`${API_BASE_URL}/api/organizations/my-api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  return extractData<CreateCompanyApiKeyResult>(
    response,
    "Failed to create API key. Please try again."
  )
}

export async function revokeMyCompanyApiKey(
  apiKeyId: string
): Promise<RevokeCompanyApiKeyResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to revoke the API key")
  }

  const response = await fetch(
    `${API_BASE_URL}/api/organizations/my-api-keys/${encodeURIComponent(apiKeyId)}/revoke`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return extractData<RevokeCompanyApiKeyResult>(
    response,
    "Failed to revoke API key. Please try again."
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
export async function revealMyCompanyApiKey(
  apiKeyId: string
): Promise<{ apiKey: string; apiKeyRecord: CompanyApiKeyRecord }> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to reveal the API key")
  }

  const response = await fetch(
    `${API_BASE_URL}/api/organizations/my-api-keys/${encodeURIComponent(apiKeyId)}/reveal`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return extractData<{
    apiKey: string
    apiKeyRecord: CompanyApiKeyRecord
  }>(response, "Failed to reveal API key.")
}

export async function deleteMyCompanyApiKey(
  apiKeyId: string
): Promise<{ success: boolean }> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to delete the API key")
  }

  const response = await fetch(
    `${API_BASE_URL}/api/organizations/my-api-keys/${encodeURIComponent(apiKeyId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return extractData<{ success: boolean }>(response, "Failed to delete API key.")
}
