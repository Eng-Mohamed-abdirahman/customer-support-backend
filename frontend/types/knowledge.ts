export type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

export type KnowledgeDocumentStatus = "processing" | "ready" | "failed"

export type KnowledgeDocument = {
  _id: string
  originalName: string
  title: string
  category: string
  mimeType: string
  fileSize: number
  status: KnowledgeDocumentStatus
  totalChunks: number
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export type KnowledgeDocumentDetail = KnowledgeDocument & {
  chunksCount: number
}

export type KnowledgeDocumentsResult = {
  documents: KnowledgeDocument[]
}

export type KnowledgeDocumentResult = {
  document: KnowledgeDocumentDetail
}

export type UploadKnowledgeDocumentResult = {
  document: KnowledgeDocument
}

export type DeleteKnowledgeDocumentResult = {
  documentId: string
}
