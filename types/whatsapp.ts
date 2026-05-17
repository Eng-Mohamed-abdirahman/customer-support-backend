export type WhatsAppConnectionStatus = "connected" | "disconnected" | "pending" | "error"

export type WhatsAppConnection = {
  id?: string
  organizationId: string
  phoneNumberId?: string
  businessAccountId?: string
  status: WhatsAppConnectionStatus
  connectedAt?: string | null
  disconnectedAt?: string | null
  lastVerifiedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type ConnectWhatsAppInput = {
  phoneNumberId: string
  businessAccountId: string
  accessToken: string
  verifyToken: string
}

export type WhatsAppStatusResult = {
  connection: WhatsAppConnection
}

export type WhatsAppConnectResult = {
  connection: WhatsAppConnection
}

export type WhatsAppDisconnectResult = {
  connection: WhatsAppConnection
}
