"use client"

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react"
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  deleteKnowledgeDocument,
  getKnowledgeDocument,
  listKnowledgeDocuments,
  uploadKnowledgeDocument,
} from "@/services/knowledge.service"
import type { KnowledgeDocument, KnowledgeDocumentDetail } from "@/types/knowledge"

const acceptedMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

const maxFileSizeBytes = 10 * 1024 * 1024

const uploadCategories = ["FAQ", "How-To", "Policy", "Release Notes", "Troubleshooting", "General"]

const statusBadgeClass: Record<KnowledgeDocument["status"], string> = {
  processing: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ready: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "bg-destructive/10 text-destructive",
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB"]
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** unitIndex

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatMimeType(value: string) {
  if (value === "application/pdf") {
    return "PDF"
  }

  if (value === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "DOCX"
  }

  return "Document"
}

export default function KnowledgeBasePage() {
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null)
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocumentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadTitle, setUploadTitle] = useState("")
  const [uploadCategory, setUploadCategory] = useState(uploadCategories[0])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadFormError, setUploadFormError] = useState<string | null>(null)
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  const loadDocuments = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setLoadError(null)

    try {
      const result = await listKnowledgeDocuments()
      setDocuments(result.documents)

      if (refresh) {
        toast.success("Knowledge documents refreshed.")
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load knowledge documents. Please try again."
      setLoadError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDocuments(false)
  }, [loadDocuments])

  const validateFile = (file: File) => {
    if (!acceptedMimeTypes.includes(file.type)) {
      return "Only PDF and DOCX files are allowed."
    }

    if (file.size > maxFileSizeBytes) {
      return "File size exceeds 10MB limit."
    }

    return null
  }

  const resetUploadForm = () => {
    setUploadTitle("")
    setUploadCategory(uploadCategories[0])
    setUploadFile(null)
    setUploadFormError(null)
    setUploadProgress(0)
    setUploadError(null)
  }

  const handleUploadOpenChange = (open: boolean) => {
    setIsUploadOpen(open)

    if (open) {
      resetUploadForm()
    }
  }

  const handleUploadFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    const validationError = validateFile(file)
    if (validationError) {
      setUploadFormError(validationError)
      toast.error(validationError)
      return
    }

    setUploadFormError(null)
    setUploadFile(file)
  }

  const handleUploadSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()

    const trimmedTitle = uploadTitle.trim()

    if (!trimmedTitle) {
      setUploadFormError("Document title is required.")
      return
    }

    if (!uploadFile) {
      setUploadFormError("Please choose a PDF or DOCX file to upload.")
      return
    }

    const validationError = validateFile(uploadFile)
    if (validationError) {
      setUploadFormError(validationError)
      return
    }

    setUploadFormError(null)
    setUploadError(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      await uploadKnowledgeDocument(
        uploadFile,
        { title: trimmedTitle, category: uploadCategory },
        setUploadProgress
      )
      setUploadProgress(100)
      toast.success("Document uploaded and processed successfully.")
      setIsUploadOpen(false)
      await loadDocuments(true)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to upload document. Please try again."
      setUploadError(message)
      toast.error(message)
      await loadDocuments(true)
    } finally {
      setIsUploading(false)
    }
  }

  const handleViewDocument = async (documentId: string) => {
    setDetailError(null)

    try {
      const result = await getKnowledgeDocument(documentId)
      setSelectedDocument(result.document)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load document details."
      setDetailError(message)
      toast.error(message)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    const document = documents.find((item) => item._id === documentId)
    const confirmed = window.confirm(
      `Delete "${document?.originalName ?? "this document"}" from the knowledge base?`
    )

    if (!confirmed) {
      return
    }

    setDeletingDocumentId(documentId)

    try {
      await deleteKnowledgeDocument(documentId)
      setDocuments((currentDocuments) =>
        currentDocuments.filter((item) => item._id !== documentId)
      )
      toast.success("Knowledge document deleted.")
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to delete document. Please try again."
      toast.error(message)
    } finally {
      setDeletingDocumentId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Workspace / Knowledge Base
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              Knowledge Base
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Curate PDFs and DOCX files to power AI answers across your organization.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2"
              onClick={() => void loadDocuments(true)}
              disabled={isLoading || isRefreshing || isUploading}
            >
              {isRefreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Refresh
            </Button>

            <Button
              type="button"
              className="h-9 gap-2 bg-linear-to-r from-primary to-secondary"
              onClick={() => handleUploadOpenChange(true)}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload
            </Button>
          </div>
        </div>
      </header>

      {uploadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      ) : null}

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load documents</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {detailError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to open document</AlertTitle>
          <AlertDescription>{detailError}</AlertDescription>
        </Alert>
      ) : null}

      {isUploading ? (
        <Card className="border-border/70 bg-card/95 py-4">
          <CardContent className="space-y-3 px-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">Uploading and processing document</span>
              <span className="text-muted-foreground">{uploadProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-border/70 bg-card/95 py-0">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="text-base">Uploaded documents</CardTitle>
          <CardDescription>
            Files are processed into chunks and vectors inside your organization namespace.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 px-4 py-4">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border border-border/60 p-3 md:grid-cols-6"
                >
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No documents yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a PDF or DOCX file to start building your AI knowledge base.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-240 border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/45">
                    {[
                      "Title",
                      "Category",
                      "File name",
                      "Type",
                      "Size",
                      "Status",
                      "Chunks",
                      "Uploaded date",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {documents.map((document) => (
                    <tr key={document._id} className="border-b border-border/50 align-top">
                      <td className="max-w-60 px-4 py-4">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {document.title || document.originalName}
                        </p>
                        {document.status === "failed" && document.errorMessage ? (
                          <p className="mt-1 line-clamp-2 text-xs text-destructive">
                            {document.errorMessage}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {document.category || "General"}
                      </td>
                      <td className="max-w-80 px-4 py-4">
                        <p className="truncate text-sm text-foreground">{document.originalName}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatMimeType(document.mimeType)}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatFileSize(document.fileSize)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                            statusBadgeClass[document.status]
                          )}
                        >
                          {document.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {document.totalChunks.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {formatDate(document.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            title="View document"
                            onClick={() => void handleViewDocument(document._id)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            title="Delete document"
                            disabled={deletingDocumentId === document._id}
                            onClick={() => void handleDeleteDocument(document._id)}
                          >
                            {deletingDocumentId === document._id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedDocument)} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="truncate">
              {selectedDocument?.title || selectedDocument?.originalName}
            </DialogTitle>
            <DialogDescription>Knowledge document processing details.</DialogDescription>
          </DialogHeader>

          {selectedDocument ? (
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium text-foreground">
                  {selectedDocument.category || "General"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
                <span className="text-muted-foreground">File name</span>
                <span className="truncate font-medium text-foreground">
                  {selectedDocument.originalName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
                <span className="text-muted-foreground">Status</span>
                <span className={cn("font-medium", statusBadgeClass[selectedDocument.status])}>
                  {selectedDocument.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
                <span className="text-muted-foreground">Chunks</span>
                <span className="font-medium text-foreground">
                  {selectedDocument.chunksCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium text-foreground">
                  {formatMimeType(selectedDocument.mimeType)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
                <span className="text-muted-foreground">Size</span>
                <span className="font-medium text-foreground">
                  {formatFileSize(selectedDocument.fileSize)}
                </span>
              </div>
              {selectedDocument.errorMessage ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Processing error</AlertTitle>
                  <AlertDescription>{selectedDocument.errorMessage}</AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle2 className="size-4 text-primary" />
                  <AlertTitle>Document access is organization-scoped</AlertTitle>
                  <AlertDescription>
                    The stored file path and vector IDs are kept server-side.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadOpen} onOpenChange={handleUploadOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Knowledge Document</DialogTitle>
            <DialogDescription>
              Add a title, select a category, and upload a PDF or DOCX document.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleUploadSubmit}>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="document-title">
                Document title
              </label>
              <Input
                id="document-title"
                type="text"
                placeholder="Return policy overview"
                value={uploadTitle}
                onChange={(event) => setUploadTitle(event.target.value)}
                disabled={isUploading}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="document-file">
                Upload file
              </label>
              <input
                ref={uploadFileInputRef}
                id="document-file"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleUploadFileChange}
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 justify-between"
                onClick={() => uploadFileInputRef.current?.click()}
                disabled={isUploading}
              >
                <span className="truncate text-sm text-foreground">
                  {uploadFile
                    ? `${uploadFile.name} • ${formatFileSize(uploadFile.size)}`
                    : "No file chosen (PDF, DOCX)"}
                </span>
                <span className="text-xs text-muted-foreground">Choose file</span>
              </Button>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="document-category">
                Category
              </label>
              <select
                id="document-category"
                className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={uploadCategory}
                onChange={(event) => setUploadCategory(event.target.value)}
                disabled={isUploading}
              >
                {uploadCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {uploadFormError ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Upload details needed</AlertTitle>
                <AlertDescription>{uploadFormError}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleUploadOpenChange(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button type="submit" className="gap-2" disabled={isUploading}>
                {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
