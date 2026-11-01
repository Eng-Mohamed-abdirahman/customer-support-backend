import { getStoredToken } from "@/services/auth.service"
import type {
  ApiEnvelope,
  DeleteKnowledgeDocumentResult,
  KnowledgeDocumentResult,
  KnowledgeDocumentsResult,
  UploadKnowledgeDocumentResult,
} from "@/types/knowledge"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

async function extractData<T>(response: Response, fallbackErrorMessage: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok || body?.success === false) {
    throw new Error(body?.message ?? fallbackErrorMessage)
  }

  if (!body?.data) {
    throw new Error("Unexpected API response")
  }

  return body.data
}

function requireToken() {
  const token = getStoredToken()

  if (!token) {
    throw new Error("Please sign in to manage knowledge documents")
  }

  return token
}

export async function listKnowledgeDocuments(): Promise<KnowledgeDocumentsResult> {
  const token = requireToken()

  const response = await fetch(`${API_BASE_URL}/api/knowledge/documents`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return extractData<KnowledgeDocumentsResult>(
    response,
    "Failed to load knowledge documents. Please try again."
  )
}

export async function getKnowledgeDocument(documentId: string): Promise<KnowledgeDocumentResult> {
  const token = requireToken()

  const response = await fetch(
    `${API_BASE_URL}/api/knowledge/documents/${encodeURIComponent(documentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return extractData<KnowledgeDocumentResult>(
    response,
    "Failed to load knowledge document. Please try again."
  )
}

export async function deleteKnowledgeDocument(
  documentId: string
): Promise<DeleteKnowledgeDocumentResult> {
  const token = requireToken()

  const response = await fetch(
    `${API_BASE_URL}/api/knowledge/documents/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return extractData<DeleteKnowledgeDocumentResult>(
    response,
    "Failed to delete knowledge document. Please try again."
  )
}

export function uploadKnowledgeDocument(
  file: File,
  metadata: { title: string; category: string },
  onProgress: (progress: number) => void
): Promise<UploadKnowledgeDocumentResult> {
  const token = requireToken()

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    const formData = new FormData()

    formData.append("file", file)
    formData.append("title", metadata.title)
    formData.append("category", metadata.category)

    request.open("POST", `${API_BASE_URL}/api/knowledge/upload`)
    request.setRequestHeader("Authorization", `Bearer ${token}`)

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return
      }

      onProgress(Math.round((event.loaded / event.total) * 100))
    }

    request.onload = () => {
      let body: ApiEnvelope<UploadKnowledgeDocumentResult> | null = null

      try {
        body = JSON.parse(request.responseText || "null") as
          | ApiEnvelope<UploadKnowledgeDocumentResult>
          | null
      } catch {
        reject(new Error("Unexpected upload response"))
        return
      }

      if (request.status < 200 || request.status >= 300 || body?.success === false) {
        reject(new Error(body?.message ?? "Failed to upload document. Please try again."))
        return
      }

      if (!body?.data) {
        reject(new Error("Unexpected upload response"))
        return
      }

      resolve(body.data)
    }

    request.onerror = () => {
      reject(new Error("Network error while uploading document"))
    }

    request.send(formData)
  })
}
