export type TicketStatus = "open" | "pending" | "closed"

export type TicketRecord = {
  _id: string
  conversationId: string
  title: string
  description: string
  status: TicketStatus
  customerName?: string
  customerPhone?: string
  createdAt?: string
  updatedAt?: string
}

export type TicketListResult = {
  tickets: TicketRecord[]
}

export type CreateTicketInput = {
  conversationId: string
  title: string
  description: string
  customerName?: string
  customerPhone?: string
}

export type CreateTicketResult = {
  ticketId: string
  conversationId: string
  status: TicketStatus
}
