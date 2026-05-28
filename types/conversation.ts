export type ConversationRole = "user" | "assistant"

export type ConversationStatus = "open" | "pending" | "closed"

export type ConversationChannel = "whatsapp" | "website" | "dashboard"

export type ConversationRecord = {
  _id: string
  organizationId: string
  channel: ConversationChannel
  customerPhone: string
  customerName?: string
  status: ConversationStatus
  assignedAgent?: string | null
  aiEnabled?: boolean
  lastMessageAt?: string
  createdAt?: string
  updatedAt?: string
}

export type ConversationMessageRecord = {
  _id: string
  conversationId: string
  organizationId: string
  senderType: "customer" | "assistant" | "agent" | "system"
  messageType: "text" | "image" | "document" | "audio"
  contentText?: string
  media?: {
    id?: string
    url?: string
    mimeType?: string
    fileName?: string
    caption?: string
    sha256?: string
    fileSize?: number
  }
  aiGenerated?: boolean
  externalId?: string
  createdAt?: string
}

export type ConversationMessage = {
  id: string
  role: ConversationRole
  content: string
  createdAt: string
}

export type ConversationKnowledgeSnapshot = {
  totalDocuments: number
  readyDocuments: number
  processingDocuments: number
  failedDocuments: number
}

export type ConversationKnowledgeSnapshotResult = {
  knowledge: ConversationKnowledgeSnapshot
  sourceNames: string[]
}

export type SendConversationTestMessageInput = {
  message: string
  history: Array<Pick<ConversationMessage, "role" | "content">>
  customerApiKey?: string
  channel?: string
  customer?: {
    id?: string
    name?: string
    email?: string
  }
}

export type ConversationResponseMode = "rag" | "fallback" | "human_handoff"

export type ConversationRetrievedSource = {
  embeddingId: string
  score: number
  documentId: string
  documentName: string
  chunkIndex: number
  excerpt: string
}

export type ConversationUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  totalTokensUsed: number
  monthlyLimit: number
}

export type SendConversationTestMessageResult = {
  reply: string
  mode: ConversationResponseMode
  knowledge: ConversationKnowledgeSnapshot
  sourceNames: string[]
  retrievedSources: ConversationRetrievedSource[]
  usage: ConversationUsage
  usedCustomerApiKey: boolean
}

export type ConversationListResult = {
  conversations: ConversationRecord[]
}

export type ConversationMessagesResult = {
  messages: ConversationMessageRecord[]
}