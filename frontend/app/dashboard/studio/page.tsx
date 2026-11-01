"use client"

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit3,
  History,
  Info,
  Loader2,
  Maximize2,
  Palette,
  RefreshCw,
  Sparkles,
  UploadCloud,
  ImageIcon,
  Wand2,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { uploadLogo } from "@/services/brand.service"
import {
  listMyCompanyApiKeys,
  revealMyCompanyApiKey,
  createMyCompanyApiKey,
} from "@/services/company.service"
import {
  optimizePrompt,
  generateDesign,
  regenerateDesign,
  pollDesignUntilComplete,
} from "@/services/design.service"
import type { DesignHistoryRecord, DesignType, LayoutAnalysis } from "@/types/design"

export default function StudioCanvasPage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(true)
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)

  // View Mode: 'comparison' | 'solo'
  const [viewMode, setViewMode] = useState<"comparison" | "solo">("comparison")

  // Generate Prompt Form State
  const [promptIntention, setPromptIntention] = useState("")
  const [promptRefPhotoUrl, setPromptRefPhotoUrl] = useState("")
  const [promptRefPhotoName, setPromptRefPhotoName] = useState("")
  const [promptRefPhotoPreview, setPromptRefPhotoPreview] = useState<string | null>(null)
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false)
  const [isUploadingPromptPhoto, setIsUploadingPromptPhoto] = useState(false)

  // Design Generator Form State
  const [designType, setDesignType] = useState<DesignType>("poster")
  const [promptText, setPromptText] = useState("")
  const [designRefImageUrl, setDesignRefImageUrl] = useState("")
  const [designRefImageName, setDesignRefImageName] = useState("")
  const [designRefImagePreview, setDesignRefImagePreview] = useState<string | null>(null)
  const [isUploadingDesignRef, setIsUploadingDesignRef] = useState(false)
  const [layoutAnalysis, setLayoutAnalysis] = useState<LayoutAnalysis | null>(null)

  // Generation status state
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generationStep, setGenerationStep] = useState<string>("")

  const promptPhotoInputRef = useRef<HTMLInputElement>(null)
  const designRefInputRef = useRef<HTMLInputElement>(null)

  const canvasReferenceUrl =
    designRefImagePreview || designRefImageUrl || promptRefPhotoPreview || promptRefPhotoUrl

  const activeReferenceUrl = (designRefImageUrl || promptRefPhotoUrl).trim()

  const syncReferenceUrls = (url: string, name: string) => {
    setPromptRefPhotoUrl(url)
    setPromptRefPhotoName(name)
    setDesignRefImageUrl(url)
    setDesignRefImageName(name)
  }

  const syncReferencePreview = (previewUrl: string) => {
    revokePreview(promptRefPhotoPreview)
    revokePreview(designRefImagePreview)
    setPromptRefPhotoPreview(previewUrl)
    setDesignRefImagePreview(previewUrl)
  }

  const revokePreview = (previewUrl: string | null) => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl)
    }
  }

  // Auto-resolve or create organization API key
  useEffect(() => {
    async function resolveApiKey() {
      setIsApiKeyLoading(true)
      setApiKeyError(null)

      try {
        // 1. Check local storage
        const storedKey = localStorage.getItem("studio-api-key")
        if (storedKey) {
          setApiKey(storedKey)
          setIsApiKeyLoading(false)
          return
        }

        // 2. Fetch company keys
        const response = await listMyCompanyApiKeys()
        const activeKey = response.apiKeys.find((k) => !k.revokedAt)

        if (activeKey) {
          // Reveal the full API key
          const revealed = await revealMyCompanyApiKey(activeKey.id)
          setApiKey(revealed.apiKey)
          localStorage.setItem("studio-api-key", revealed.apiKey)
        } else {
          // Create a new key
          const created = await createMyCompanyApiKey({ name: "Studio Canvas Auto Key" })
          setApiKey(created.apiKey)
          localStorage.setItem("studio-api-key", created.apiKey)
          toast.info("Created a new API key for your design workspace.")
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to authenticate workspace API Key."
        setApiKeyError(message)
      } finally {
        setIsApiKeyLoading(false)
      }
    }

    void resolveApiKey()
  }, [])

  useEffect(() => {
    return () => {
      revokePreview(promptRefPhotoPreview)
      revokePreview(designRefImagePreview)
    }
  }, [promptRefPhotoPreview, designRefImagePreview])

  // File Upload Helper (reusable)
  const uploadAsset = async (
    file: File,
    onStartUpload: () => void,
    onPreview: (previewUrl: string) => void,
    onSuccess: (url: string, name: string) => void,
    onFinish: () => void
  ) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file format. Please upload PNG, JPEG or SVG.")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size exceeds 2MB limit.")
      return
    }

    onStartUpload()
    onPreview(URL.createObjectURL(file))
    const toastId = toast.loading(`Uploading ${file.name} to asset server...`)

    try {
      const { url, publicUrl } = await uploadLogo(file)
      onSuccess(url || publicUrl, file.name)
      toast.success("Reference uploaded successfully.", { id: toastId })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Asset upload failed."
      toast.error(message, { id: toastId })
    } finally {
      onFinish()
    }
  }

  // Handle Optimize Prompt Click
  const handleOptimizePrompt = async () => {
    if (!promptIntention.trim()) {
      toast.error("Please enter a concept brief first.")
      return
    }

    if (!apiKey) {
      toast.error("No active API key found for this workspace.")
      return
    }

    setIsOptimizingPrompt(true)
    const toastId = toast.loading("AI is optimizing your prompt structure...")

    try {
      const result = await optimizePrompt(
        {
          rawIntention: promptIntention,
          referencePhotoUrl: promptRefPhotoUrl || undefined,
          designType,
        },
        apiKey
      )
      setPromptText(result.optimizedPrompt)
      setLayoutAnalysis(result.layoutAnalysis ?? null)
      if (promptRefPhotoUrl) {
        setDesignRefImageUrl(promptRefPhotoUrl)
        setDesignRefImageName(promptRefPhotoName || "Prompt reference")
        if (promptRefPhotoPreview) {
          setDesignRefImagePreview(promptRefPhotoPreview)
        }
      }
      toast.success("Prompt optimized and loaded into Generator.", { id: toastId })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to optimize prompt."
      toast.error(message, { id: toastId })
    } finally {
      setIsOptimizingPrompt(false)
    }
  }

  // Handle Trigger Generation
  const handleGenerateDesign = async () => {
    if (!promptText.trim()) {
      toast.error("Prompt design instructions are required.")
      return
    }

    if (!activeReferenceUrl) {
      toast.error("Upload a reference image first. Generation edits your reference layout with your prompt.")
      return
    }

    if (activeReferenceUrl.startsWith("blob:")) {
      toast.error("Reference image is still uploading. Wait for the upload to finish.")
      return
    }

    if (layoutAnalysis && !activeReferenceUrl) {
      toast.error("Re-upload the reference image used during prompt optimization before generating.")
      return
    }

    if (!apiKey) {
      toast.error("Authorization key missing.")
      return
    }

    setIsGenerating(true)
    setGeneratedImage(null)
    setGenerationStep("Queueing generation request on GPU cluster...")
    const toastId = toast.loading("Submitting image generation task...")

    try {
      setGenerationStep("Submitting to AI image model...")
      const result = await generateDesign(
        {
          designType,
          promptText,
          rawUserIntention: promptIntention || undefined,
          referenceImageUrl: activeReferenceUrl,
          layoutAnalysis,
        },
        apiKey
      )

      setActiveDesignId(result.designId)
      setGenerationStep("Rendering textures and brand layout...")
      toast.loading("Generating graphic on GPU cluster (this may take up to 2 minutes)...", {
        id: toastId,
      })

      const record = await pollDesignUntilComplete(result.designId, apiKey)

      if (!record.generatedImageUrl) {
        throw new Error("Generation completed but returned no output image.")
      }

      setGeneratedImage(record.generatedImageUrl)
      toast.success("Design generated successfully!", { id: toastId })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate design."
      toast.error(message, { id: toastId })
    } finally {
      setIsGenerating(false)
      setGenerationStep("")
    }
  }

  // Handle Synchronous Re-generate
  const handleRegenerate = async () => {
    if (!activeDesignId) {
      toast.error("No active design found to regenerate. Generate a design first.")
      return
    }

    if (!apiKey) return

    setIsGenerating(true)
    setGeneratedImage(null)
    setGenerationStep("Refetching guidelines and compiling prompt...")
    const toastId = toast.loading("Regenerating graphic...")

    try {
      const response = await regenerateDesign(
        {
          previousDesignId: activeDesignId,
          useUpdatedBrand: true,
        },
        apiKey
      )

      if (response.success && response.data.generatedImageUrl) {
        setGeneratedImage(response.data.generatedImageUrl)
        toast.success("Design regenerated successfully.", { id: toastId })
      } else {
        throw new Error("Regeneration failed to compile image.")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to regenerate design."
      toast.error(message, { id: toastId })
    } finally {
      setIsGenerating(false)
      setGenerationStep("")
    }
  }

  const handleDownload = () => {
    if (!generatedImage) return
    // Simple download trigger
    const link = document.createElement("a")
    link.href = generatedImage
    link.download = `studio-design-${designType}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isApiKeyLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto h-[70vh] flex flex-col justify-center items-center">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Initializing creative canvas...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-7xl mx-auto min-h-[calc(100vh-8rem)]">
      {/* Sidebar Control Panel */}
      <aside className="w-full md:w-[380px] shrink-0 space-y-6">
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/studio/history">
              <History className="size-4" />
              Design History
            </Link>
          </Button>
        </div>

        {apiKeyError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription className="text-xs">{apiKeyError}</AlertDescription>
          </Alert>
        )}

        {/* Card A: Generate Prompt */}
        <Card className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-border bg-muted/10 flex items-center gap-2">
            <Wand2 className="size-4.5 text-primary" />
            <h3 className="font-semibold text-sm">Generate Prompt</h3>
          </div>
          <CardContent className="p-5 space-y-5">
            {/* Reference Photo Input */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Reference Photo</Label>
              <input
                type="file"
                ref={promptPhotoInputRef}
                className="hidden"
                accept=".png,.jpg,.jpeg,.svg"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    void uploadAsset(
                      e.target.files[0],
                      () => setIsUploadingPromptPhoto(true),
                      (previewUrl) => {
                        syncReferencePreview(previewUrl)
                      },
                      (url, name) => {
                        syncReferenceUrls(url, name)
                      },
                      () => {
                        setIsUploadingPromptPhoto(false)
                        if (promptPhotoInputRef.current) {
                          promptPhotoInputRef.current.value = ""
                        }
                      }
                    )
                  }
                }}
              />
              <div
                onClick={() => promptPhotoInputRef.current?.click()}
                className={`border border-dashed border-border rounded-lg p-5 flex flex-col items-center justify-center gap-2 bg-muted/15 cursor-pointer hover:border-primary/80 transition-colors ${
                  isUploadingPromptPhoto ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                {isUploadingPromptPhoto ? (
                  <Loader2 className="size-5 animate-spin text-primary" />
                ) : (
                  <UploadCloud className="size-5 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground text-center leading-normal">
                  {promptRefPhotoName ? promptRefPhotoName : "Drag and drop or click to upload"}
                </span>
              </div>
              {(promptRefPhotoPreview || promptRefPhotoUrl) && (
                <div className="rounded-lg border border-border overflow-hidden bg-muted/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={promptRefPhotoPreview || promptRefPhotoUrl}
                    alt="Prompt reference preview"
                    className="w-full h-28 object-cover"
                  />
                </div>
              )}
            </div>

            {/* Prompt Brief Textarea */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Prompt Brief</Label>
              <textarea
                className="w-full bg-background border border-input rounded-lg p-3 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 min-h-[90px] resize-none"
                placeholder="Enter a brief concept of how you need to make the design, and our AI will help you build a well-structured prompt."
                value={promptIntention}
                onChange={(e) => setPromptIntention(e.target.value)}
                disabled={isOptimizingPrompt || isGenerating}
              />
            </div>

            {/* Generate Prompt Button */}
            <Button
              variant="outline"
              onClick={handleOptimizePrompt}
              disabled={isOptimizingPrompt || isGenerating}
              className="w-full h-10 gap-2 font-medium"
            >
              {isOptimizingPrompt ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate Prompt
            </Button>
          </CardContent>
        </Card>

        {/* Card B: Design Generator */}
        <Card className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-border bg-muted/10 flex items-center gap-2">
            <Palette className="size-4.5 text-primary" />
            <h3 className="font-semibold text-sm">Design Generator</h3>
          </div>
          <CardContent className="p-5 space-y-5">
            {/* Design Type Dropdown */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Design Type</Label>
              <select
                className="w-full h-10 px-3 border border-input rounded-lg text-sm bg-background transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 appearance-none cursor-pointer"
                value={designType}
                onChange={(e) => setDesignType(e.target.value as DesignType)}
                disabled={isGenerating}
              >
                <option value="poster">Poster</option>
                <option value="flyer">Flyer</option>
                <option value="brochure">Brochure</option>
                <option value="social_media_post">Social Media Post</option>
                <option value="banner">Banner</option>
              </select>
            </div>

            {/* Reference Input */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Reference <span className="text-destructive">*</span>
              </Label>
              <input
                type="file"
                ref={designRefInputRef}
                className="hidden"
                accept=".png,.jpg,.jpeg,.svg"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    void uploadAsset(
                      e.target.files[0],
                      () => setIsUploadingDesignRef(true),
                      (previewUrl) => {
                        syncReferencePreview(previewUrl)
                      },
                      (url, name) => {
                        syncReferenceUrls(url, name)
                      },
                      () => {
                        setIsUploadingDesignRef(false)
                        if (designRefInputRef.current) {
                          designRefInputRef.current.value = ""
                        }
                      }
                    )
                  }
                }}
              />
              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0 h-9 font-medium"
                  onClick={() => designRefInputRef.current?.click()}
                  disabled={isUploadingDesignRef || isGenerating}
                >
                  {isUploadingDesignRef ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Upload"
                  )}
                </Button>
                <div className="flex-1 bg-muted/15 h-9 rounded-lg border border-input/60 flex items-center px-3 text-xs text-muted-foreground truncate">
                  {designRefImageName || "Required — upload the poster to edit"}
                </div>
              </div>
              {(designRefImagePreview || designRefImageUrl) && (
                <div className="rounded-lg border border-border overflow-hidden bg-muted/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={designRefImagePreview || designRefImageUrl}
                    alt="Design reference preview"
                    className="w-full h-28 object-cover"
                  />
                </div>
              )}
            </div>

            {/* Prompt Design Input */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Prompt Design <span className="text-muted-foreground font-normal">(used as-is)</span>
              </Label>
              <textarea
                className="w-full bg-background border border-input rounded-lg p-3 font-mono text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 min-h-[110px] resize-none"
                placeholder="Detailed marketing poster composition..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            {/* Generate Design Action */}
            <Button
              onClick={handleGenerateDesign}
              disabled={isGenerating || isUploadingDesignRef}
              className="w-full h-11 bg-primary text-primary-foreground font-semibold shadow-md"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="size-4.5 animate-spin" />
                  Generating...
                </div>
              ) : (
                "Generate Design"
              )}
            </Button>
          </CardContent>
        </Card>
      </aside>

      {/* Main Canvas Area */}
      <section className="flex-1 flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Canvas Header */}
        <header className="h-16 px-6 border-b border-border bg-muted/10 flex justify-between items-center shrink-0">
          <h2 className="font-semibold text-foreground text-sm">Design Page Workspace</h2>
          <div className="flex bg-muted rounded-lg p-0.5 border border-border/60">
            <button
              onClick={() => setViewMode("comparison")}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "comparison"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Comparison
            </button>
            <button
              onClick={() => setViewMode("solo")}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "solo"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Solo View
            </button>
          </div>
        </header>

        {/* Canvas Content Grid */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div
            className={`grid gap-6 h-full items-start ${
              viewMode === "comparison" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 max-w-3xl mx-auto"
            }`}
          >
            {/* Left Frame: Reference Design */}
            {viewMode === "comparison" && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Reference Design
                  </h4>
                  <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    Original
                  </span>
                </div>
                <div className="aspect-[0.75] bg-muted/15 border border-border border-dashed rounded-2xl flex flex-col justify-between p-6 relative overflow-hidden">
                  {canvasReferenceUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={canvasReferenceUrl}
                      src={canvasReferenceUrl}
                      alt="Uploaded reference"
                      className="absolute inset-0 w-full h-full object-contain bg-muted/20 p-4"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-5" style={{
                        backgroundImage: "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                        backgroundSize: "20px 20px"
                      }}></div>
                      {/* Placeholder UI Wireframe */}
                      <div className="w-2/3 h-10 bg-muted rounded-md"></div>
                      <div className="w-1/3 h-5 bg-muted rounded-md"></div>
                      <div className="flex-1 flex items-center justify-center my-4">
                        <ImageIcon className="size-16 text-muted-foreground/30" />
                      </div>
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0"></div>
                        <div className="flex-1 space-y-2">
                          <div className="w-full h-3 bg-muted rounded"></div>
                          <div className="w-3/4 h-3 bg-muted rounded"></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Solo mode: compact reference preview */}
            {viewMode === "solo" && canvasReferenceUrl ? (
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Reference
                </h4>
                <div className="h-36 rounded-xl border border-border overflow-hidden bg-muted/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={canvasReferenceUrl}
                    alt="Reference"
                    className="w-full h-full object-contain p-3"
                  />
                </div>
              </div>
            ) : null}

            {/* Right Frame: Generated Design */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Generated Design
                </h4>
                {generatedImage && (
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="size-3 fill-primary text-primary-foreground" />
                    High Fidelity
                  </span>
                )}
              </div>
              <div className="aspect-[0.75] bg-muted/10 border border-border rounded-2xl relative overflow-hidden flex flex-col items-center justify-center shadow-inner group">
                {isGenerating ? (
                  // Glass Loading Overlay
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex flex-col justify-center items-center p-6 text-center">
                    <Loader2 className="size-10 text-primary animate-spin mb-4" />
                    <p className="font-semibold text-sm text-foreground">Generating Design...</p>
                    <p className="text-xs text-muted-foreground mt-2 max-w-xs">{generationStep}</p>
                  </div>
                ) : null}

                {generatedImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={generatedImage}
                      src={generatedImage}
                      alt="Generated design"
                      className="w-full h-full object-contain bg-muted/20 p-4"
                    />
                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-20">
                      <a
                        href={generatedImage}
                        target="_blank"
                        rel="noreferrer"
                        className="w-11 h-11 rounded-full bg-white text-on-surface flex items-center justify-center hover:scale-105 transition-transform"
                      >
                        <Maximize2 className="size-4 text-black" />
                      </a>
                      <button
                        onClick={handleRegenerate}
                        className="w-11 h-11 rounded-full bg-white text-on-surface flex items-center justify-center hover:scale-105 transition-transform"
                      >
                        <Edit3 className="size-4 text-black" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground select-none">
                    <ImageIcon className="size-12 text-muted-foreground/30 mb-3 animate-pulse" />
                    <p className="text-sm font-semibold text-foreground">Canvas Empty</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-normal">
                      Fill out prompt brief or design instructions in the generator panel and click Generate.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Utility Footer */}
        <footer className="h-20 border-t border-border bg-muted/10 px-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="size-4 text-muted-foreground/80" />
            <span>Resolution: 896x1200px • Format: PNG</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex border border-border rounded-lg overflow-hidden bg-background shadow-sm">
              <button
                onClick={handleDownload}
                disabled={!generatedImage}
                className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors border-r border-border disabled:opacity-50"
              >
                Download PNG
              </button>
              <button
                disabled={!generatedImage}
                className="px-2 py-2 text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>

            <Button
              onClick={handleRegenerate}
              disabled={isGenerating || !activeDesignId}
              variant="secondary"
              className="h-10 text-xs font-semibold gap-1.5 px-4 shadow-sm"
            >
              <RefreshCw className={`size-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              Re-generate This Design
            </Button>
          </div>
        </footer>
      </section>
    </div>
  )
}
