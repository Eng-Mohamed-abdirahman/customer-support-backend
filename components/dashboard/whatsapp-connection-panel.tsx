"use client"

import {
  CheckCircle2,
  ChevronRight,
  ClipboardCopy,
  ExternalLink,
  Globe,
  KeyRound,
  Link2,
  Loader2,
  MessageSquareText,
  Phone,
  PlugZap,
  RefreshCw,
  Shield,
  ShieldCheck,
  Unlink,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  completeEmbeddedSignup,
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppStatus,
} from "@/services/whatsapp.service"
import type { EmbeddedSignupVerifyToken, WhatsAppConnection } from "@/types/whatsapp"

declare global {
  interface Window {
    FB?: {
      init: (options: Record<string, unknown>) => void
      login: (callback: (response: any) => void, options: Record<string, unknown>) => void
    }
    fbAsyncInit?: () => void
  }
}

/* ---------- helpers ---------- */

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string; icon: typeof Wifi }> = {
  connected: {
    label: "Connected",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: Wifi,
  },
  disconnected: {
    label: "Disconnected",
    dot: "bg-rose-500",
    bg: "bg-rose-500/10 border-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    icon: WifiOff,
  },
  pending: {
    label: "Pending",
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    icon: Loader2,
  },
  error: {
    label: "Error",
    dot: "bg-orange-500",
    bg: "bg-orange-500/10 border-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
    icon: WifiOff,
  },
}

const webhookStatusConfig: Record<string, { label: string; color: string }> = {
  subscribed: { label: "Subscribed", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  pending: { label: "Pending", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  failed: { label: "Failed", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  unknown: { label: "Unknown", color: "bg-muted text-muted-foreground border-border/60" },
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "—"
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

const formatRelative = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diffMs = Date.now() - date.getTime()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diffMs < minute) return "Just now"
  if (diffMs < hour) return `${Math.round(diffMs / minute)}m ago`
  if (diffMs < day) return `${Math.round(diffMs / hour)}h ago`
  return `${Math.round(diffMs / day)}d ago`
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

/* ---------- component ---------- */

export function WhatsAppConnectionPanel() {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [disconnectTarget, setDisconnectTarget] = useState<WhatsAppConnection | null>(null)
  const [isSdkReady, setIsSdkReady] = useState(false)
  const [sdkError, setSdkError] = useState<string | null>(null)
  const [verifyTokens, setVerifyTokens] = useState<EmbeddedSignupVerifyToken[]>([])
  const [showVerifyTokens, setShowVerifyTokens] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("manual")

  // Manual form state
  const [manualForm, setManualForm] = useState({
    wabaId: "",
    businessName: "",
    phoneNumberId: "",
    displayPhoneNumber: "",
    accessToken: "",
    verifyToken: "",
  })
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({})
  const [isManualConnecting, setIsManualConnecting] = useState(false)

  /* ---------- load ---------- */

  const loadStatus = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)

    setLoadError(null)

    try {
      const result = await getWhatsAppStatus()
      setConnections(result.connections ?? [])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load WhatsApp status"
      setLoadError(message)
    } finally {
      if (refresh) setIsRefreshing(false)
      else setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus(false)
  }, [loadStatus])

  /* ---------- SDK ---------- */

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    if (!appId) {
      setSdkError("Meta App ID is not configured. Use Manual Setup to connect your WhatsApp number.")
      return
    }

    if (window.FB) {
      setIsSdkReady(true)
      return
    }

    window.fbAsyncInit = () => {
      window.FB?.init({ appId, cookie: true, xfbml: false, version: "v20.0" })
      setIsSdkReady(true)
    }

    const scriptId = "facebook-jssdk"
    if (document.getElementById(scriptId)) return

    const script = document.createElement("script")
    script.id = scriptId
    script.src = "https://connect.facebook.net/en_US/sdk.js"
    script.async = true
    script.defer = true
    script.onerror = () => setSdkError("Failed to load Facebook SDK")
    document.body.appendChild(script)
  }, [])

  /* ---------- derived ---------- */

  const activeConnections = useMemo(
    () => connections.filter((c) => c.status !== "disconnected"),
    [connections]
  )

  const overallStatus = useMemo(() => {
    if (!activeConnections.length) return "disconnected"
    if (activeConnections.some((c) => c.status === "error")) return "error"
    if (activeConnections.some((c) => c.status === "pending")) return "pending"
    return "connected"
  }, [activeConnections])

  const hasMetaEnvVars = Boolean(
    process.env.NEXT_PUBLIC_META_APP_ID &&
    process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID &&
    process.env.NEXT_PUBLIC_WHATSAPP_REDIRECT_URI
  )

  const webhookUrl = `${API_BASE_URL}/api/webhooks/whatsapp`

  /* ---------- copy helper ---------- */

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  /* ---------- embedded signup ---------- */

  const handleEmbeddedSignup = async () => {
    setSuccessMessage(null)
    setLoadError(null)

    const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID
    const redirectUri = process.env.NEXT_PUBLIC_WHATSAPP_REDIRECT_URI

    if (!configId || !redirectUri) {
      setLoadError("Missing WhatsApp configuration. Please check your environment variables.")
      return
    }

    if (!window.FB || !isSdkReady) {
      setLoadError("Facebook SDK is not ready. Please try again.")
      return
    }

    setIsConnecting(true)

    window.FB.login(
      (response: any) => {
        const handleAuthResponse = async () => {
          const code = response?.authResponse?.code
          if (!code) {
            setIsConnecting(false)
            setLoadError("Embedded signup was cancelled or failed.")
            return
          }

          try {
            const result = await completeEmbeddedSignup({ code, redirectUri })
            setConnections(result.connections)
            setVerifyTokens(result.verifyTokens)
            setShowVerifyTokens(true)
            setSuccessMessage("WhatsApp connected successfully via Embedded Signup!")
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to complete signup"
            setLoadError(message)
          } finally {
            setIsConnecting(false)
          }
        }
        void handleAuthResponse()
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        scope: "whatsapp_business_management,whatsapp_business_messaging",
        redirect_uri: redirectUri,
      }
    )
  }

  /* ---------- manual connect ---------- */

  const validateManualForm = () => {
    const errors: Record<string, string> = {}
    if (!manualForm.wabaId.trim()) errors.wabaId = "WABA ID is required"
    if (!manualForm.phoneNumberId.trim()) errors.phoneNumberId = "Phone number ID is required"
    if (!manualForm.accessToken.trim() || manualForm.accessToken.trim().length < 10)
      errors.accessToken = "A valid access token is required (min 10 characters)"
    if (!manualForm.verifyToken.trim() || manualForm.verifyToken.trim().length < 6)
      errors.verifyToken = "Verify token is required (min 6 characters)"
    setManualErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleManualConnect = async () => {
    if (!validateManualForm()) return

    setSuccessMessage(null)
    setLoadError(null)
    setIsManualConnecting(true)

    try {
      const result = await connectWhatsApp({
        wabaId: manualForm.wabaId.trim(),
        businessName: manualForm.businessName.trim() || undefined,
        phoneNumberId: manualForm.phoneNumberId.trim(),
        displayPhoneNumber: manualForm.displayPhoneNumber.trim() || undefined,
        accessToken: manualForm.accessToken.trim(),
        verifyToken: manualForm.verifyToken.trim(),
      })

      setConnections((prev) => {
        const exists = prev.some(
          (c) => c.phoneNumberId === result.connection.phoneNumberId
        )
        if (exists)
          return prev.map((c) =>
            c.phoneNumberId === result.connection.phoneNumberId
              ? result.connection
              : c
          )
        return [...prev, result.connection]
      })

      setSuccessMessage("WhatsApp number connected successfully!")
      setManualForm({
        wabaId: "",
        businessName: "",
        phoneNumberId: "",
        displayPhoneNumber: "",
        accessToken: "",
        verifyToken: "",
      })
      setManualErrors({})
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to connect WhatsApp"
      setLoadError(message)
    } finally {
      setIsManualConnecting(false)
    }
  }

  /* ---------- disconnect ---------- */

  const handleDisconnect = async () => {
    setSuccessMessage(null)
    setLoadError(null)

    try {
      setIsDisconnecting(true)
      const target = disconnectTarget?.phoneNumberId
      if (!target) throw new Error("Phone number ID is missing")

      const result = await disconnectWhatsApp(target)
      setConnections((current) =>
        current.map((item) =>
          item.phoneNumberId === result.connection.phoneNumberId
            ? result.connection
            : item
        )
      )
      setSuccessMessage("WhatsApp number disconnected.")
      setShowDisconnectConfirm(false)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to disconnect WhatsApp"
      setLoadError(message)
    } finally {
      setIsDisconnecting(false)
    }
  }

  /* ---------- render ---------- */

  const cfg = statusConfig[overallStatus] ?? statusConfig.disconnected
  const StatusIcon = cfg.icon

  return (
    <div className="space-y-6">
      {/* ─── Header Card ─── */}
      <Card className="relative overflow-hidden border-border/60 bg-card/95 shadow-sm">
        {/* Decorative gradient bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-emerald-500 opacity-80" />

        <CardHeader className="flex flex-col gap-4 pb-4 pt-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageSquareText className="size-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight">
                WhatsApp Business
              </CardTitle>
              <CardDescription className="max-w-md text-sm">
                Connect your WhatsApp Business number to receive customer messages and enable AI auto-replies.
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                cfg.bg,
                cfg.text
              )}
            >
              <span className={cn("size-2 rounded-full", cfg.dot)} />
              {cfg.label}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-full"
              onClick={() => void loadStatus(true)}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-6">
          {/* ─── Alerts ─── */}
          {loadError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert className="border-emerald-500/30 bg-emerald-500/5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <AlertTitle className="text-emerald-700 dark:text-emerald-400">
                Success
              </AlertTitle>
              <AlertDescription className="text-emerald-600 dark:text-emerald-300">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-2xl bg-muted/50" />
              <div className="h-48 animate-pulse rounded-2xl bg-muted/50" />
            </div>
          ) : (
            <>
              {/* ─── Connected Numbers ─── */}
              {activeConnections.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Connected Numbers
                    </h3>
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      {activeConnections.length}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {activeConnections.map((conn) => {
                      const st = statusConfig[conn.status ?? "disconnected"] ?? statusConfig.disconnected
                      const wh = webhookStatusConfig[conn.webhookSubscriptionStatus ?? "unknown"] ?? webhookStatusConfig.unknown

                      return (
                        <div
                          key={conn.phoneNumberId}
                          className="group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background to-muted/20 p-4 transition-all hover:border-border hover:shadow-sm"
                        >
                          {/* Status dot */}
                          <div className={cn("absolute right-4 top-4 size-2.5 rounded-full", st.dot)} />

                          <div className="space-y-3">
                            <div>
                              <p className="pr-6 text-sm font-semibold text-foreground">
                                {conn.displayPhoneNumber || conn.phoneNumberId || "WhatsApp Number"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {conn.businessName || "Business Account"}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-muted-foreground">Phone ID</span>
                                <p className="font-medium text-foreground truncate" title={conn.phoneNumberId}>
                                  {conn.phoneNumberId ?? "—"}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">WABA ID</span>
                                <p className="font-medium text-foreground truncate" title={conn.wabaId}>
                                  {conn.wabaId ?? "—"}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Webhook</span>
                                <div className="mt-0.5">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "h-5 rounded-full px-1.5 text-[9px] font-semibold uppercase",
                                      wh.color
                                    )}
                                  >
                                    {wh.label}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Connected</span>
                                <p className="font-medium text-foreground">
                                  {formatRelative(conn.connectedAt) ?? formatDateTime(conn.connectedAt)}
                                </p>
                              </div>
                            </div>

                            <Separator className="opacity-60" />

                            <div className="flex items-center justify-between">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  st.bg,
                                  st.text
                                )}
                              >
                                <span className={cn("size-1.5 rounded-full", st.dot)} />
                                {st.label}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1.5 rounded-full px-3 text-[11px] text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                                onClick={() => {
                                  setDisconnectTarget(conn)
                                  setShowDisconnectConfirm(true)
                                }}
                                disabled={isDisconnecting}
                              >
                                <Unlink className="size-3" />
                                Disconnect
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ─── Connection Methods ─── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {activeConnections.length > 0 ? "Add Another Number" : "Connect WhatsApp"}
                  </h3>
                </div>

                <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-background to-muted/10 p-6 flex flex-col items-center text-center">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-4">
                    <Globe className="size-6" />
                  </div>
                  <h4 className="text-base font-semibold text-foreground mb-1">
                    Meta Embedded Signup
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm mb-6">
                    Connect your account in seconds using Meta&apos;s unified v4 flow. This will automatically provision credentials and link your WhatsApp Business Account.
                  </p>

                  {!hasMetaEnvVars ? (
                    <div className="w-full text-left rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="mt-0.5 size-4 shrink-0 text-amber-500" />
                        <div className="space-y-2 text-xs text-amber-700 dark:text-amber-300">
                          <p className="font-semibold">Configuration Required</p>
                          <p>
                            To use Embedded Signup, please add the following environment variables to your{" "}
                            <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono text-[10px]">
                              .env
                            </code>{" "}
                            file:
                          </p>
                          <ul className="ml-4 list-disc space-y-1 text-[11px]">
                            <li>
                              <code className="font-mono">NEXT_PUBLIC_META_APP_ID</code>
                            </li>
                            <li>
                              <code className="font-mono">NEXT_PUBLIC_WHATSAPP_CONFIG_ID</code>
                            </li>
                            <li>
                              <code className="font-mono">
                                NEXT_PUBLIC_WHATSAPP_REDIRECT_URI
                              </code>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-4">
                      <Button
                        type="button"
                        size="lg"
                        className="w-full gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                        onClick={handleEmbeddedSignup}
                        disabled={isConnecting || !isSdkReady}
                      >
                        {isConnecting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        Connect with Meta
                      </Button>

                      <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="size-4 text-emerald-500" />
                        <span>Meta SDK Ready &middot; Embedded Signup v4</span>
                      </div>

                      {sdkError && (
                        <p className="text-xs text-rose-500 mt-2">
                          {sdkError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Disconnect Dialog ─── */}
      <Dialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disconnect WhatsApp?</DialogTitle>
            <DialogDescription>
              This will stop automated replies and webhook processing for{" "}
              <span className="font-semibold text-foreground">
                {disconnectTarget?.displayPhoneNumber || disconnectTarget?.phoneNumberId || "this number"}
              </span>
              . You can reconnect at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setShowDisconnectConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-2 rounded-xl"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Unlink className="size-4" />
              )}
              Disconnect
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Verify Tokens Dialog ─── */}
      <Dialog open={showVerifyTokens} onOpenChange={setShowVerifyTokens}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Webhook Verify Tokens</DialogTitle>
            <DialogDescription>
              Copy and store these verify tokens securely. You&apos;ll need them for the Meta webhook configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {verifyTokens.map((item) => (
              <div
                key={item.phoneNumberId}
                className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  Phone Number ID:{" "}
                  <span className="font-semibold text-foreground">
                    {item.phoneNumberId}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={item.verifyToken}
                    className="h-9 rounded-xl font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 rounded-xl"
                    onClick={() =>
                      void copyToClipboard(item.verifyToken, `verify-${item.phoneNumberId}`)
                    }
                  >
                    {copiedField === `verify-${item.phoneNumberId}` ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <ClipboardCopy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
