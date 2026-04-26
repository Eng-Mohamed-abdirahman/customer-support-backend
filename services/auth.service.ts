import type {
  ApiEnvelope,
  LoginPayload,
  LoginResult,
  SafeUser,
  UpdateUserProfileInput,
  UserRole,
} from "@/types/auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
const AUTH_TOKEN_STORAGE_KEY = "token"
const AUTH_USER_STORAGE_KEY = "user"

type ApiUser = {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  company: string | null
}

const mapRoleToLegacyAccess = (role: UserRole) => {
  // Keeps existing dashboard scaffolds working while backend has tenant roles.
  if (role === "admin") {
    return {
      platformRole: "super_admin" as const,
      membershipRole: null,
    }
  }

  if (role === "company-admin") {
    return {
      platformRole: null,
      membershipRole: "admin" as const,
    }
  }

  return {
    platformRole: null,
    membershipRole: "agent" as const,
  }
}

const normalizeSafeUser = (user: ApiUser): SafeUser => {
  const firstName = user.firstName ?? ""
  const lastName = user.lastName ?? ""
  const fullName = `${firstName} ${lastName}`.trim()
  const legacyAccess = mapRoleToLegacyAccess(user.role)

  return {
    _id: user._id,
    firstName,
    lastName,
    fullName: fullName || user.email,
    email: user.email,
    role: user.role,
    company: user.company ?? null,
    status: "active",
    platformRole: legacyAccess.platformRole,
    membershipRole: legacyAccess.membershipRole,
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null
  }

  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
}

export function setStoredAuth(data: LoginResult) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token)
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data.user))
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  localStorage.removeItem(AUTH_USER_STORAGE_KEY)
}

export async function loginUser(payload: LoginPayload): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const body = (await response.json().catch(() => null)) as ApiEnvelope<LoginResult> | null

  if (!response.ok) {
    throw new Error(body?.message ?? "Login failed. Please try again.")
  }

  if (!body?.data) {
    throw new Error("Unexpected login response")
  }

  return {
    token: body.data.token,
    user: normalizeSafeUser(body.data.user as unknown as ApiUser),
  }
}

export async function getCurrentUser(token?: string): Promise<SafeUser> {
  const resolvedToken = token ?? getStoredToken()

  if (!resolvedToken) {
    throw new Error("Missing auth token")
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${resolvedToken}`,
    },
  })

  const body = (await response.json().catch(() => null)) as ApiEnvelope<SafeUser> | null

  if (!response.ok) {
    throw new Error(body?.message ?? "Unauthorized")
  }

  if (!body?.data) {
    throw new Error("Unexpected user response")
  }

  return normalizeSafeUser(body.data as unknown as ApiUser)
}

export async function updateCurrentUserProfile(
  payload: UpdateUserProfileInput
): Promise<SafeUser> {
  const token = getStoredToken()

  if (!token) {
    throw new Error("Missing auth token")
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const body = (await response.json().catch(() => null)) as ApiEnvelope<SafeUser> | null

  if (!response.ok) {
    throw new Error(body?.message ?? "Failed to update profile")
  }

  if (!body?.data) {
    throw new Error("Unexpected profile update response")
  }

  const normalizedUser = normalizeSafeUser(body.data as unknown as ApiUser)
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(normalizedUser))

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("supportly:user-updated", {
        detail: normalizedUser,
      })
    )
  }

  return normalizedUser
}
