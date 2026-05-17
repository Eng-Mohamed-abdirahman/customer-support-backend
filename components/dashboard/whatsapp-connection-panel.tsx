"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Link2, Loader2, PlugZap, RefreshCw, ShieldCheck, Unlink } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppStatus,
} from "@/services/whatsapp.service"
import type { ConnectWhatsAppInput, WhatsAppConnection } from "@/types/whatsapp"

const connectSchema = z.object({
  phoneNumberId: z.string().trim().min(2, "Phone number ID is required"),
  businessAccountId: z.string().trim().min(2, "Business account ID is required"),
  accessToken: z.string().trim().min(10, "Access token is required"),
  verifyToken: z.string().trim().min(6, "Verify token is required"),
})

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
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)

  const form = useForm<ConnectWhatsAppInput>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      phoneNumberId: "",
      businessAccountId: "",
      accessToken: "",
      verifyToken: "",
    },
  })

  const loadStatus = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setLoadError(null)

    try {
      const result = await getWhatsAppStatus()
      setConnection(result.connection)
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

  const connectionStatus = connection?.status ?? "disconnected"

  const statusBadgeClassName = statusStyles[connectionStatus] ?? statusStyles.disconnected

  const hasConnection = connectionStatus === "connected"

  const onSubmit = async (values: ConnectWhatsAppInput) => {
    setSuccessMessage(null)
    setLoadError(null)

    try {
      setIsSubmitting(true)
      const result = await connectWhatsApp({
        phoneNumberId: values.phoneNumberId.trim(),
        businessAccountId: values.businessAccountId.trim(),
        accessToken: values.accessToken.trim(),
        verifyToken: values.verifyToken.trim(),
      })

      setConnection(result.connection)
      setSuccessMessage("WhatsApp connection saved successfully.")
      form.reset({
        phoneNumberId: "",
        businessAccountId: "",
        accessToken: "",
        verifyToken: "",
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to connect WhatsApp"
      setLoadError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDisconnect = async () => {
    setSuccessMessage(null)
    setLoadError(null)

    try {
      setIsDisconnecting(true)
      const result = await disconnectWhatsApp()
      setConnection(result.connection)
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
        description: "Use the same verify token configured in Meta Developers",
      },
      {
        title: "Phone number ID",
        description: "Use the WhatsApp Business phone number ID",
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
                        {hasConnection
                          ? "Your WhatsApp account is connected and ready."
                          : "Not connected yet. Complete the form to connect."}
                      </p>
                    </div>

                    {hasConnection ? (
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-9 gap-2"
                        onClick={() => setShowDisconnectConfirm(true)}
                        disabled={isDisconnecting}
                      >
                        {isDisconnecting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Unlink className="size-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-700 dark:text-amber-300">
                        <ShieldCheck className="size-4" />
                        Awaiting credentials
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        Phone number ID
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {connection?.phoneNumberId ?? "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        Business account ID
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {connection?.businessAccountId ?? "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        Connected at
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDateTime(connection?.connectedAt ?? null)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        Last verified
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {formatDateTime(connection?.lastVerifiedAt ?? null)}
                      </p>
                    </div>
                  </div>
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
                    <p>3. Add the verify token from this form inside Meta Developers</p>
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

                  <Form {...form}>
                    <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
                      <FormField
                        control={form.control}
                        name="phoneNumberId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone number ID</FormLabel>
                            <FormControl>
                              <Input placeholder="123456789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="businessAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business account ID</FormLabel>
                            <FormControl>
                              <Input placeholder="987654321" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="accessToken"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Access token</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="WhatsApp access token" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="verifyToken"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Verify token</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Webhook verify token" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full gap-2"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                        Save connection
                      </Button>
                    </form>
                  </Form>
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
    </div>
  )
}
