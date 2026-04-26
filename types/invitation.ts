import type { UserRole } from "@/types/auth"
import { z } from "zod"

export type ApiEnvelope<T> = {
  status: string
  message: string
  data: T
}

export type CreateInvitationPayload = {
  email: string
  role: UserRole
  company?: string
}

export type CreateInvitationResult = {
  invitationId: string
  email: string
  role: UserRole
  company: string | null
  expiresAt: string
}

export type AcceptInvitationPayload = {
  token: string
  firstName: string
  lastName: string
  password: string
}

export type AcceptInvitationResult = {
  user: {
    _id: string
    firstName: string
    lastName: string
    email: string
    role: UserRole
    company: string | null
  }
}

export const companyUserInviteRoleSchema = z.enum(["company-admin", "staff"])

export const createCompanyUserInvitationSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  role: companyUserInviteRoleSchema,
})

export type CreateCompanyUserInvitationInput = z.infer<typeof createCompanyUserInvitationSchema>
