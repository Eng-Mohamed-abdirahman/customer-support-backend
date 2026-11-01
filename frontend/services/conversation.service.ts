import { getStoredToken } from "@/services/auth.service"
import { listKnowledgeDocuments } from "@/services/knowledge.service"
import type {
  ConversationResponseMode,
  ConversationRetrievedSource,
  ConversationKnowledgeSnapshot,
  ConversationKnowledgeSnapshotResult,
  ConversationUsage,
  ConversationListResult,
  ConversationMessageRecord,
  ConversationMessagesResult,
  SendConversationTestMessageInput,
  SendConversationTestMessageResult,
} from "@/types/conversation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

type BackendConversationResponse = {
  reply: string
  mode: ConversationResponseMode
  retrievedSources: ConversationRetrievedSource[]
  usage: ConversationUsage
  channel: string
}

type AiChatResponse = {
  reply: string
  mode: ConversationResponseMode
  retrievedSources: ConversationRetrievedSource[]
  usage: ConversationUsage
  channel: string
}

const emptyKnowledgeSnapshot: ConversationKnowledgeSnapshot = {
  totalDocuments: 0,
  readyDocuments: 0,
  processingDocuments: 0,
  failedDocuments: 0,
}

const emptyUsage: ConversationUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  totalTokensUsed: 0,
  monthlyLimit: 0,
}

async function buildKnowledgeSnapshot(): Promise<ConversationKnowledgeSnapshotResult> {
  const result = await listKnowledgeDocuments()
  const documents = result.documents

  return {
    knowledge: {
      totalDocuments: documents.length,
      readyDocuments: documents.filter((document) => document.status === "ready").length,
      processingDocuments: documents.filter((document) => document.status === "processing").length,
      failedDocuments: documents.filter((document) => document.status === "failed").length,
    },
    sourceNames: documents
      .filter((document) => document.status === "ready")
      .slice(0, 4)
      .map((document) => document.originalName),
  }
}

export async function getConversationKnowledgeSnapshot(): Promise<ConversationKnowledgeSnapshotResult> {
  return buildKnowledgeSnapshot()
}

export async function sendConversationTestMessage(
  input: SendConversationTestMessageInput
): Promise<SendConversationTestMessageResult> {
  const normalizedMessage = input.message.trim()

  if (!normalizedMessage) {
    throw new Error("Please type a message before sending.")
  }

  let snapshot: ConversationKnowledgeSnapshotResult = {
    knowledge: emptyKnowledgeSnapshot,
    sourceNames: [],
  }

  try {
    snapshot = await buildKnowledgeSnapshot()
  } catch {
    // Keep the conversation flow usable even when knowledge stats are temporarily unavailable.
  }

  const usingCustomerApiKey = Boolean(input.customerApiKey?.trim())

  const endpoint = usingCustomerApiKey
    ? `${API_BASE_URL}/api/conversations/ask`
    : `${API_BASE_URL}/api/conversations/preview`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (usingCustomerApiKey) {
    headers["x-api-key"] = input.customerApiKey!.trim()
  } else {
    const token = getStoredToken()
    if (!token) {
      throw new Error("Please sign in before using dashboard conversation preview.")
    }

    headers.Authorization = `Bearer ${token}`
  }

  const payload = {
    message: normalizedMessage,
    channel: input.channel ?? (usingCustomerApiKey ? "website" : "dashboard"),
    history: input.history.map((item) => ({
      role: item.role === "assistant" ? "assistant" : "customer",
      content: item.content,
    })),
    customer: input.customer,
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })

  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<BackendConversationResponse>
    | null

  if (!response.ok || body?.success === false || !body?.data) {
    throw new Error(body?.message ?? "Failed to generate conversation response.")
  }

  return {
    mode: body.data.mode,
    reply: body.data.reply,
    knowledge: snapshot.knowledge,
    sourceNames: snapshot.sourceNames,
    retrievedSources: Array.isArray(body.data.retrievedSources)
      ? body.data.retrievedSources
      : [],
    usage: body.data.usage ?? emptyUsage,
    usedCustomerApiKey: usingCustomerApiKey,
  }
}

export async function listConversations(params?: {
  status?: string
  channel?: string
  limit?: number
  skip?: number
}): Promise<ConversationListResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view conversations")
  }

  const searchParams = new URLSearchParams()
  if (params?.status) {
    searchParams.set("status", params.status)
  }
  if (params?.channel) {
    searchParams.set("channel", params.channel)
  }
  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit))
  }
  if (typeof params?.skip === "number") {
    searchParams.set("skip", String(params.skip))
  }

  const response = await fetch(
    `${API_BASE_URL}/api/conversations${searchParams.size ? `?${searchParams}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const body = (await response.json().catch(() => null)) as ApiEnvelope<ConversationListResult> | null

  if (!response.ok || body?.success === false || !body?.data) {
    throw new Error(body?.message ?? "Failed to load conversations.")
  }

  return body.data
}

export async function listConversationMessages(
  conversationId: string,
  params?: {
    limit?: number
    skip?: number
  }
): Promise<ConversationMessagesResult> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to view conversation messages")
  }

  const searchParams = new URLSearchParams()
  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit))
  }
  if (typeof params?.skip === "number") {
    searchParams.set("skip", String(params.skip))
  }

  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${encodeURIComponent(conversationId)}/messages${searchParams.size ? `?${searchParams}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<ConversationMessagesResult>
    | null

  if (!response.ok || body?.success === false || !body?.data) {
    throw new Error(body?.message ?? "Failed to load messages.")
  }

  return body.data
}

export async function takeoverConversation(conversationId: string): Promise<{
  conversationId: string
  assignedAgent: string
}> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to take over conversations")
  }

  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${encodeURIComponent(conversationId)}/takeover`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<{ conversationId: string; assignedAgent: string }>
    | null

  if (!response.ok || body?.success === false || !body?.data) {
    throw new Error(body?.message ?? "Failed to take over conversation.")
  }

  return body.data
}

export async function returnConversationToAi(conversationId: string): Promise<{
  conversationId: string
  assignedAgent: string | null
}> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to return conversations to AI")
  }

  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${encodeURIComponent(conversationId)}/return-to-ai`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<{ conversationId: string; assignedAgent: string | null }>
    | null

  if (!response.ok || body?.success === false || !body?.data) {
    throw new Error(body?.message ?? "Failed to return conversation to AI.")
  }

  return body.data
}

export async function sendAgentMessage(conversationId: string, content: string): Promise<{
  message: ConversationMessageRecord
}> {
  const token = getStoredToken()
  if (!token) {
    throw new Error("Please sign in to send messages")
  }

  const payload = {
    content,
  }

  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  )

  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<{ message: ConversationMessageRecord }>
    | null

  if (!response.ok || body?.success === false || !body?.data) {
    throw new Error(body?.message ?? "Failed to send message.")
  }

  return body.data
}

export async function sendAiChatMessage(input: {
  apiKey: string
  message: string
  history?: Array<{ role: "customer" | "assistant"; content: string }>
  channel?: string
}): Promise<AiChatResponse> {
  const normalizedMessage = input.message.trim()
  if (!normalizedMessage) {
    throw new Error("Please type a message before sending.")
  }

  const apiKey = input.apiKey.trim()
  if (!apiKey) {
    throw new Error("API key is required for AI chat.")
  }

  const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      message: normalizedMessage,
      channel: input.channel ?? "whatsapp",
      history: input.history ?? [],
    }),
  })

  const body = (await response.json().catch(() => null)) as ApiEnvelope<AiChatResponse> | null

  if (!response.ok || body?.success === false || !body?.data) {
    throw new Error(body?.message ?? "Failed to generate AI response.")
  }

  return body.data
}