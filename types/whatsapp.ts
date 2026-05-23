export type WhatsAppConnectionStatus = "connected" | "disconnected" | "pending" | "error"

export type WebhookSubscriptionStatus = "subscribed" | "pending" | "failed" | "unknown"

export type WhatsAppConnection = {
  id?: string
  organizationId: string
  wabaId?: string
  businessName?: string
  phoneNumberId?: string
  displayPhoneNumber?: string
  status: WhatsAppConnectionStatus
  webhookSubscriptionStatus?: WebhookSubscriptionStatus
  webhookSubscribedAt?: string | null
  accessTokenExpiresAt?: string | null
  connectedAt?: string | null
  disconnectedAt?: string | null
  lastVerifiedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type ConnectWhatsAppInput = {
  wabaId: string
  businessName?: string
  phoneNumberId: string
  displayPhoneNumber?: string
  accessToken: string
  verifyToken: string
}

export type WhatsAppStatusResult = {
  connections: WhatsAppConnection[]
}

export type WhatsAppConnectResult = {
  connection: WhatsAppConnection
}

export type WhatsAppDisconnectResult = {
  connection: WhatsAppConnection
}

export type EmbeddedSignupVerifyToken = {
  phoneNumberId: string
  verifyToken: string
}

export type EmbeddedSignupResult = {
  connections: WhatsAppConnection[]
  verifyTokens: EmbeddedSignupVerifyToken[]
}
