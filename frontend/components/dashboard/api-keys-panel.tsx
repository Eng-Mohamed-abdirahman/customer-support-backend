"use client"

import {
  AlertCircle,
  Copy,
  Eye,
  KeyRound,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createMyCompanyApiKey,
  deleteMyCompanyApiKey,
  listMyCompanyApiKeys,
  revealMyCompanyApiKey,
} from "@/services/company.service"
import type { CompanyApiKeyRecord } from "@/types/company"

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const timeAgo = (value: string | null | undefined) => {
  if (!value) return "Never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Never"
  
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + " years ago"
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + " months ago"
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + " days ago"
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + " hours ago"
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + " minutes ago"
  return Math.floor(seconds) + " seconds ago"
}

type ApiKeyRow = CompanyApiKeyRecord & {
  statusLabel: string
}

export function ApiKeysPanel() {
  const [apiKeys, setApiKeys] = useState<CompanyApiKeyRecord[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isRevealing, setIsRevealing] = useState<string | null>(null)
  
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({})
  const [nameInput, setNameInput] = useState("")

  const loadKeys = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setLoadError(null)

    try {
      const response = await listMyCompanyApiKeys()
      setApiKeys(response.apiKeys)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load API keys."
      setLoadError(message)
    } finally {
      if (refresh) {
        setIsRefreshing(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadKeys(false)
  }, [loadKeys])

  const rows = useMemo<ApiKeyRow[]>(() => {
    return apiKeys.map((record) => ({
      ...record,
      statusLabel: record.revokedAt ? "Revoked" : "Active",
    }))
  }, [apiKeys])

  const handleCreateKey = async () => {
    setLoadError(null)

    const trimmedName = nameInput.trim()

    if (trimmedName.length === 1) {
      toast.error("API key name must be at least 2 characters.")
      return
    }

    try {
      setIsCreating(true)
      const response = await createMyCompanyApiKey({
        name: trimmedName || "Primary",
      })

      setApiKeys((previous) => [response.apiKeyRecord, ...previous])
      setNameInput("")
      
      setRevealedKeys((prev) => ({
         ...prev,
         [response.apiKeyRecord.id]: response.apiKey,
      }))
      
      toast.success("API key created. Store it somewhere safe.")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create API key."
      setLoadError(message)
      toast.error(message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyKey = async (keyValue: string) => {
    if (!keyValue || typeof navigator === "undefined") {
      return
    }

    try {
      await navigator.clipboard.writeText(keyValue)
      toast.success("API key copied to clipboard.")
    } catch (err) {
      console.error(err)
      toast.error("Unable to copy API key.")
    }
  }

  const handleDeleteKey = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
       return
    }

    setLoadError(null)

    try {
      setIsDeleting(recordId)
      await deleteMyCompanyApiKey(recordId)

      setApiKeys((previous) => previous.filter((r) => r.id !== recordId))
      
      const newRevealed = { ...revealedKeys }
      delete newRevealed[recordId]
      setRevealedKeys(newRevealed)
      
      toast.success("API key deleted successfully.")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete API key."
      setLoadError(message)
      toast.error(message)
    } finally {
      setIsDeleting(null)
    }
  }
  
  const handleRevealKey = async (recordId: string) => {
     if (revealedKeys[recordId]) {
        const newRevealed = { ...revealedKeys }
        delete newRevealed[recordId]
        setRevealedKeys(newRevealed)
        return
     }
  
     try {
       setIsRevealing(recordId)
       const response = await revealMyCompanyApiKey(recordId)
       
       setApiKeys((previous) =>
          previous.map((record) =>
            record.id === response.apiKeyRecord.id ? response.apiKeyRecord : record
          )
       )
       
       setRevealedKeys((prev) => ({
          ...prev,
          [recordId]: response.apiKey,
       }))
       
       toast.success("API key revealed.")
     } catch (error: unknown) {
       console.error(error);
       const message = error instanceof Error ? error.message : "Failed to reveal API key."
       toast.error(message)
     } finally {
       setIsRevealing(null)
     }
  }

  return (
    <Card className="border-border/70 bg-card/95 py-0 shadow-sm">
      <CardHeader className="py-4 border-b border-border/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-card-foreground">API keys</CardTitle>
            <CardDescription>
              Create and manage API keys for your organization workspace.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2 shadow-sm"
            onClick={() => void loadKeys(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`${isRefreshing ? "animate-spin" : ""} size-4`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-5 pb-5">
        {loadError ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-end gap-3 max-w-xl mb-4">
          <div className="space-y-2 flex-grow">
            <Label htmlFor="apiKeyName">New Key Name</Label>
            <Input
              id="apiKeyName"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="e.g. Production or QA"
              disabled={isCreating}
              className="h-10 bg-background"
            />
          </div>
          <Button
            type="button"
            onClick={handleCreateKey}
            disabled={isCreating}
            className="gap-2 shrink-0 h-10"
          >
            <KeyRound className="size-4" />
            {isCreating ? "Generating..." : "Generate key"}
          </Button>
        </div>

        <div className="rounded-md border border-border/70 overflow-x-auto shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40 text-muted-foreground">
              <TableRow>
                <TableHead className="font-medium whitespace-nowrap">Name</TableHead>
                <TableHead className="font-medium whitespace-nowrap">API Key</TableHead>
                <TableHead className="font-medium whitespace-nowrap hidden md:table-cell">Created</TableHead>
                <TableHead className="font-medium whitespace-nowrap hidden lg:table-cell">Last Revealed</TableHead>
                <TableHead className="font-medium text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Loading API keys...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No API keys yet. Generate one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((record) => (
                  <TableRow key={record.id} className="group">
                    <TableCell className="font-medium text-foreground whitespace-nowrap">{record.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-[250px] min-w-[200px]">
                        <Input
                          readOnly
                          className="h-8 font-mono text-xs w-full bg-muted/50 border-input/50"
                          value={revealedKeys[record.id] || `${record.keyPrefix}••••••••••••`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => handleCopyKey(revealedKeys[record.id] || record.keyPrefix)}
                          disabled={!revealedKeys[record.id]}
                          title={revealedKeys[record.id] ? "Copy full API Key" : "Reveal to copy full key"}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap hidden md:table-cell">
                      {formatDateTime(record.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap hidden lg:table-cell">
                      {timeAgo(record.lastRevealedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant={revealedKeys[record.id] ? "secondary" : "outline"}
                          size="sm"
                          className={`h-8 gap-1.5 transition-colors ${revealedKeys[record.id] ? '' : 'text-muted-foreground group-hover:text-foreground'}`}
                          onClick={() => handleRevealKey(record.id)}
                          disabled={isRevealing === record.id}
                        >
                          <Eye className={`size-3.5 ${revealedKeys[record.id] ? 'text-primary' : ''}`} />
                          {revealedKeys[record.id] ? "Hide" : isRevealing === record.id ? "..." : "Reveal"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteKey(record.id)}
                          disabled={isDeleting === record.id}
                          title="Delete API key"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
