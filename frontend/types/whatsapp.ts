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

export type WhatsAppWebhookLog = {
  _id?: string
  status?: string
  externalId?: string
  eventType?: string
  errorMessage?: string
  createdAt?: string
  phoneNumberId?: string
}

export type WhatsAppWebhookStatus = {
  callbackUrl: string
  callbackIsPublic?: boolean
  messagesFieldSubscribed?: boolean
  metaCallbackUrl?: string | null
  subscribedFields?: string[]
  metaError?: string | null
  recentLogs: WhatsAppWebhookLog[]
  processedCount: number
  failedCount: number
}

export type WhatsAppWebhookSetupResult = {
  callbackUrl: string
  allSucceeded: boolean
  results: Array<{
    phoneNumberId: string
    wabaId: string
    status: "subscribed" | "failed"
    error?: string
  }>
  metaSubscriptions?: {
    active?: boolean
    callbackUrl?: string | null
    fields?: string[]
    messagesSubscribed?: boolean
  } | null
}

export type WhatsAppStatusResult = {
  connections: WhatsAppConnection[]
  webhook?: WhatsAppWebhookStatus
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
