export type ApiEnvelope<T> = {
  status: string
  message: string
  data: T
}

export type UserRole = "admin" | "company-admin" | "staff"

export type MembershipRole = "owner" | "admin" | "agent" | "viewer"

export type PlatformRole = "super_admin" | "platform_admin"

export type LoginPayload = {
  email: string
  password: string
}

export type SafeUser = {
  _id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  role: UserRole
  company: string | null
  status: string
  platformRole: PlatformRole | null
  membershipRole: MembershipRole | null
}

export type LoginResult = {
  token: string
  user: SafeUser
}

export type UpdateUserProfileInput = {
  firstName: string
  lastName: string
  email: string
}
