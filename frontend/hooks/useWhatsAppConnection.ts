import { useCallback, useEffect, useMemo, useState } from "react"

import { API_BASE_URL, type ManualFormState } from "@/components/whatsapp/whatsapp-utils"
import {
  completeEmbeddedSignup,
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppStatus,
  setupInboundWebhooks,
} from "@/services/whatsapp.service"
import type {
  EmbeddedSignupVerifyToken,
  WhatsAppConnection,
  WhatsAppWebhookStatus,
} from "@/types/whatsapp"

declare global {
  interface Window {
    FB?: {
      init: (options: Record<string, unknown>) => void
      login: (callback: (response: any) => void, options: Record<string, unknown>) => void
    }
    fbAsyncInit?: () => void
  }
}

export function useWhatsAppConnection(organizationId?: string) {
  const [connections, setConnections] = useState<WhatsAppConnection[]>([])
  const [webhookStatus, setWebhookStatus] = useState<WhatsAppWebhookStatus | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
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
  const [manualForm, setManualForm] = useState<ManualFormState>({
    wabaId: "",
    businessName: "",
    phoneNumberId: "",
    displayPhoneNumber: "",
    accessToken: "",
    verifyToken: "",
  })
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({})
  const [isManualConnecting, setIsManualConnecting] = useState(false)
  const [isSettingUpWebhooks, setIsSettingUpWebhooks] = useState(false)

  /* ---------- load ---------- */

  useEffect(() => {
    if (typeof window === "undefined") return
    const rawUser = localStorage.getItem("user")
    if (!rawUser) return
    try {
      const parsed = JSON.parse(rawUser)
      setIsSuperAdmin(parsed.platformRole === "super_admin")
    } catch {
      setIsSuperAdmin(false)
    }
  }, [])

  const loadStatus = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)

    setLoadError(null)

    try {
      const result = await getWhatsAppStatus(organizationId)
      setConnections(result.connections ?? [])
      setWebhookStatus(result.webhook ?? null)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load WhatsApp status"
      setLoadError(message)
    } finally {
      if (refresh) setIsRefreshing(false)
      else setIsLoading(false)
    }
  }, [organizationId])

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

  const webhookUrl =
    webhookStatus?.callbackUrl ||
    process.env.NEXT_PUBLIC_WEBHOOK_PUBLIC_URL ||
    `${API_BASE_URL}/api/webhooks/whatsapp`

  const webhookUsesLocalhost = /localhost|127\.0\.0\.1/i.test(webhookUrl)
  const inboundMessagesEnabled = webhookStatus?.messagesFieldSubscribed === true

  const handleSetupInboundWebhooks = useCallback(async () => {
    setIsSettingUpWebhooks(true)
    setLoadError(null)
    setSuccessMessage(null)

    try {
      const result = await setupInboundWebhooks(organizationId)
      if (result.allSucceeded && result.metaSubscriptions?.messagesSubscribed !== false) {
        setSuccessMessage(
          "Inbound WhatsApp messages enabled. Send a test message from your phone and watch for [Webhook] POST in backend logs."
        )
      } else {
        setLoadError(
          "Webhook setup completed with issues. Check backend logs and ensure PUBLIC_API_URL is a public URL Meta can reach."
        )
      }
      await loadStatus(true)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to enable inbound WhatsApp messages"
      setLoadError(message)
    } finally {
      setIsSettingUpWebhooks(false)
    }
  }, [loadStatus, organizationId])

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
            const result = await completeEmbeddedSignup({ code, redirectUri }, organizationId)
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
      }, organizationId)

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

      const result = await disconnectWhatsApp(target, organizationId)
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

  const requestDisconnect = (conn: WhatsAppConnection) => {
    setDisconnectTarget(conn)
    setShowDisconnectConfirm(true)
  }

  return {
    webhookStatus,
    isSuperAdmin,
    isLoading,
    isRefreshing,
    isConnecting,
    isDisconnecting,
    loadError,
    successMessage,
    showDisconnectConfirm,
    setShowDisconnectConfirm,
    disconnectTarget,
    isSdkReady,
    sdkError,
    verifyTokens,
    showVerifyTokens,
    setShowVerifyTokens,
    copiedField,
    activeTab,
    setActiveTab,
    manualForm,
    setManualForm,
    manualErrors,
    isManualConnecting,
    isSettingUpWebhooks,
    loadStatus,
    activeConnections,
    overallStatus,
    hasMetaEnvVars,
    webhookUrl,
    webhookUsesLocalhost,
    inboundMessagesEnabled,
    handleSetupInboundWebhooks,
    copyToClipboard,
    handleEmbeddedSignup,
    handleManualConnect,
    handleDisconnect,
    requestDisconnect,
  }
}
