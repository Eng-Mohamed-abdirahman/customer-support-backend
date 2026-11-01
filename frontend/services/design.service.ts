import type {
  OptimizePromptPayload,
  OptimizePromptResult,
  GenerateDesignPayload,
  GenerateDesignResult,
  RegenerateDesignPayload,
  RegenerateDesignResult,
  DesignHistoryRecord,
  ListDesignHistoryParams,
  ListDesignHistoryResult,
} from "@/types/design"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

async function designRequest<T>(
  url: string,
  method: string,
  apiKey: string,
  payload?: unknown
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.message ?? `Request failed with status ${response.status}`)
  }

  return body as T
}

/**
 * Optimize a raw intention prompt into a detailed, high-fidelity prompt.
 */
export async function optimizePrompt(
  payload: OptimizePromptPayload,
  apiKey: string
): Promise<OptimizePromptResult> {
  return designRequest<OptimizePromptResult>(
    `${API_BASE_URL}/api/designs/optimize-prompt`,
    "POST",
    apiKey,
    payload
  )
}

/**
 * Trigger design generation. Returns design id and image when generation completes.
 */
export async function generateDesign(
  payload: GenerateDesignPayload,
  apiKey: string
): Promise<GenerateDesignResult> {
  return designRequest<GenerateDesignResult>(
    `${API_BASE_URL}/api/designs/generate`,
    "POST",
    apiKey,
    payload
  )
}

/**
 * Regenerate design based on a previous run.
 */
export async function regenerateDesign(
  payload: RegenerateDesignPayload,
  apiKey: string
): Promise<RegenerateDesignResult> {
  return designRequest<RegenerateDesignResult>(
    `${API_BASE_URL}/api/designs/regenerate`,
    "POST",
    apiKey,
    payload
  )
}

/**
 * Fetch a design record by id.
 */
export async function getDesignStatus(
  designId: string,
  apiKey: string
): Promise<DesignHistoryRecord> {
  const body = await designRequest<DesignHistoryRecord & { success: boolean }>(
    `${API_BASE_URL}/api/designs/${encodeURIComponent(designId)}`,
    "GET",
    apiKey
  )
  const { success: _success, ...record } = body
  return record
}

/**
 * List design history for the organization.
 */
export async function listDesignHistory(
  apiKey: string,
  params?: ListDesignHistoryParams
): Promise<ListDesignHistoryResult> {
  const search = new URLSearchParams()
  if (params?.status) search.set("status", params.status)
  if (params?.designType) search.set("designType", params.designType)
  if (params?.page) search.set("page", String(params.page))
  if (params?.limit) search.set("limit", String(params.limit))

  const query = search.toString()
  const url = `${API_BASE_URL}/api/designs${query ? `?${query}` : ""}`

  return designRequest<ListDesignHistoryResult>(url, "GET", apiKey)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Poll design status until completed, failed, or timeout.
 */
export async function pollDesignUntilComplete(
  designId: string,
  apiKey: string,
  options?: { timeoutMs?: number; intervalMs?: number }
): Promise<DesignHistoryRecord> {
  const timeoutMs = options?.timeoutMs ?? 180_000
  const intervalMs = options?.intervalMs ?? 2_500
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const record = await getDesignStatus(designId, apiKey)

    if (record.status === "completed" && record.generatedImageUrl) {
      return record
    }

    if (record.status === "failed") {
      throw new Error("Design generation failed on the server.")
    }

    await sleep(intervalMs)
  }

  throw new Error("Design generation timed out. Please try again.")
}
