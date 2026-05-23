"use client"

import {
  CheckCircle2,
  Copy,
  Link2,
  Loader2,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Unlink,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  completeEmbeddedSignup,
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

const statusStyles: Record<string, string> = {
  connected: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  disconnected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  error: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
}

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "-"
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

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

  const loadStatus = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setLoadError(null)

    try {
      const result = await getWhatsAppStatus()
      setConnections(result.connections ?? [])
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load WhatsApp status"
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
    void loadStatus(false)
  }, [loadStatus])

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    if (!appId) {
      setSdkError("Missing NEXT_PUBLIC_META_APP_ID")
      return
    }

    if (window.FB) {
      setIsSdkReady(true)
      return
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v20.0",
      })
      setIsSdkReady(true)
    }

    const scriptId = "facebook-jssdk"
    if (document.getElementById(scriptId)) {
      return
    }

    const script = document.createElement("script")
    script.id = scriptId
    script.src = "https://connect.facebook.net/en_US/sdk.js"
    script.async = true
    script.defer = true
    script.onerror = () => setSdkError("Failed to load Facebook SDK")
    document.body.appendChild(script)
  }, [])

  const connectionStatus = useMemo(() => {
    if (!connections.length) {
      return "disconnected"
    }

    if (connections.some((item) => item.status === "error")) {
      return "error"
    }

    if (connections.some((item) => item.status === "pending")) {
      return "pending"
    }

    return "connected"
  }, [connections])

  const statusBadgeClassName = statusStyles[connectionStatus] ?? statusStyles.disconnected

  const handleConnect = async () => {
    setSuccessMessage(null)
    setLoadError(null)

    const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID
    const redirectUri = process.env.NEXT_PUBLIC_WHATSAPP_REDIRECT_URI

    if (!configId) {
      setLoadError("Missing NEXT_PUBLIC_WHATSAPP_CONFIG_ID")
      return
    }

    if (!redirectUri) {
      setLoadError("Missing NEXT_PUBLIC_WHATSAPP_REDIRECT_URI")
      return
    }

    if (!window.FB || !isSdkReady) {
      setLoadError("Facebook SDK is not ready")
      return
    }

    setIsConnecting(true)

    window.FB.login(
      async (response: any) => {
        const code = response?.authResponse?.code
        if (!code) {
          setIsConnecting(false)
          setLoadError("Embedded signup was cancelled or failed")
          return
        }

        try {
          const result = await completeEmbeddedSignup({ code, redirectUri })
          setConnections(result.connections)
          setVerifyTokens(result.verifyTokens)
          setShowVerifyTokens(true)
          setSuccessMessage("WhatsApp Embedded Signup completed successfully.")
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to complete signup"
          setLoadError(message)
        } finally {
          setIsConnecting(false)
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        scope: "business_management,whatsapp_business_management,whatsapp_business_messaging",
        redirect_uri: redirectUri,
      }
    )
  }

  const handleDisconnect = async () => {
    setSuccessMessage(null)
    setLoadError(null)

    try {
      setIsDisconnecting(true)
      const target = disconnectTarget?.phoneNumberId
      if (!target) {
        throw new Error("Phone number ID is missing")
      }

      const result = await disconnectWhatsApp(target)
      setConnections((current) =>
        current.map((item) =>
          item.phoneNumberId === result.connection.phoneNumberId ? result.connection : item
        )
      )
      setSuccessMessage("WhatsApp disconnected successfully.")
      setShowDisconnectConfirm(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to disconnect WhatsApp"
      setLoadError(message)
    } finally {
      setIsDisconnecting(false)
    }
  }

  const helperItems = useMemo(
    () => [
      {
        title: "Webhook callback",
        description: "Set Meta webhook URL to /api/webhooks/whatsapp",
      },
      {
        title: "Verify token",
        description: "Use the verify token shown after Embedded Signup",
      },
      {
        title: "Required subscriptions",
        description: "Subscribe to messages, message_status, and messaging_handovers",
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/95">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">WhatsApp Business Connection</CardTitle>
            <CardDescription>
              Connect and manage your WhatsApp Business account for automated support.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                statusBadgeClassName
              )}
            >
              <span className="inline-flex size-2 rounded-full bg-current" />
              {connectionStatus}
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2"
              onClick={() => void loadStatus(true)}
              disabled={isLoading || isRefreshing}
            >
              {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : loadError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load WhatsApp connection</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Connection status</p>
                      <p className="text-xs text-muted-foreground">
                        {connections.length
                          ? `${connections.length} WhatsApp number(s) connected.`
                          : "Not connected yet. Use Embedded Signup to connect."}
                      </p>
                    </div>

                    {connections.length ? null : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-700 dark:text-amber-300">
                        <ShieldCheck className="size-4" />
                        Awaiting Embedded Signup
                      </span>
                    )}
                  </div>

                  {connections.length ? (
                    <div className="mt-4 grid gap-3">
                      {connections.map((item) => (
                        <div
                          key={item.phoneNumberId}
                          className="rounded-lg border border-border/60 bg-card/80 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {item.displayPhoneNumber || "WhatsApp Number"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.businessName || "Business Account"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold",
                                  statusStyles[item.status ?? "disconnected"] ?? statusStyles.disconnected
                                )}
                              >
                                <span className="inline-flex size-2 rounded-full bg-current" />
                                {item.status}
                              </span>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="h-8 gap-2"
                                onClick={() => {
                                  setDisconnectTarget(item)
                                  setShowDisconnectConfirm(true)
                                }}
                                disabled={isDisconnecting}
                              >
                                {isDisconnecting &&
                                disconnectTarget?.phoneNumberId === item.phoneNumberId ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Unlink className="size-3" />
                                )}
                                Disconnect
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                            <p>
                              <span className="font-medium text-foreground">Phone number ID:</span>{" "}
                              {item.phoneNumberId ?? "-"}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">WABA ID:</span>{" "}
                              {item.wabaId ?? "-"}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Webhook:</span>{" "}
                              {item.webhookSubscriptionStatus ?? "unknown"}
                            </p>
                            <p>
                              <span className="font-medium text-foreground">Token expires:</span>{" "}
                              {formatDateTime(item.accessTokenExpiresAt ?? null)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-border/70 bg-card/90 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <PlugZap className="size-4 text-primary" />
                    Meta configuration checklist
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <p>
                      1. Set webhook URL: {(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000")}
                      /api/webhooks/whatsapp
                    </p>
                    <p>2. Subscribe to messages, message_status, and messaging_handovers</p>
                    <p>3. Add the verify token from the Embedded Signup dialog inside Meta Developers</p>
                    <p>4. Ensure the phone number ID matches the connected WhatsApp account</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-card/95 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Link2 className="size-4 text-primary" />
                    Connect WhatsApp Business
                  </div>

                  <div className="mt-4 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Use Meta Embedded Signup to connect your WhatsApp Business account securely.
                    </p>
                    <Button
                      type="button"
                      className="w-full gap-2"
                      onClick={handleConnect}
                      disabled={isConnecting || !isSdkReady}
                    >
                      {isConnecting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Connect WhatsApp
                    </Button>
                    {sdkError ? (
                      <Alert variant="destructive">
                        <AlertTitle>SDK error</AlertTitle>
                        <AlertDescription>{sdkError}</AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                </div>

                {successMessage ? (
                  <Alert>
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                ) : null}

                {helperItems.map((item) => (
                  <div key={item.title} className="rounded-xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect WhatsApp?</DialogTitle>
            <DialogDescription>
              This will stop automated replies and webhook processing until you reconnect.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setShowDisconnectConfirm(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-2"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? <Loader2 className="size-4 animate-spin" /> : <Unlink className="size-4" />}
              Disconnect
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVerifyTokens} onOpenChange={setShowVerifyTokens}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook verify tokens</DialogTitle>
            <DialogDescription>
              Copy and store these verify tokens. You will need them to validate the webhook setup in Meta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {verifyTokens.map((item) => (
              <div key={item.phoneNumberId} className="space-y-2">
                <p className="text-xs font-medium text-foreground">
                  Phone number ID: {item.phoneNumberId}
                </p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={item.verifyToken} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      await navigator.clipboard.writeText(item.verifyToken)
                      setSuccessMessage("Verify token copied to clipboard.")
                    }}
                  >
                    <Copy className="size-4" />
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
