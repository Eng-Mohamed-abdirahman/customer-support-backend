"use client"

import { Loader2, Phone, Zap } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { WhatsAppConnection } from "@/types/whatsapp"

import { WhatsAppConnectionCard } from "./whatsapp-connection-card"

type WhatsAppConnectedNumbersProps = {
  activeConnections: WhatsAppConnection[]
  inboundMessagesEnabled: boolean
  webhookUsesLocalhost: boolean
  isSettingUpWebhooks: boolean
  isSuperAdmin: boolean
  isDisconnecting: boolean
  onSetupInboundWebhooks: () => Promise<void>
  onDisconnect: (conn: WhatsAppConnection) => void
}

export function WhatsAppConnectedNumbers({
  activeConnections,
  inboundMessagesEnabled,
  webhookUsesLocalhost,
  isSettingUpWebhooks,
  isSuperAdmin,
  isDisconnecting,
  onSetupInboundWebhooks,
  onDisconnect,
}: WhatsAppConnectedNumbersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Phone className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Connected Numbers
        </h3>
        <Badge variant="outline" className="rounded-full text-[10px]">
          {activeConnections.length}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          {!inboundMessagesEnabled ? (
            <Badge
              variant="outline"
              className="rounded-full border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400"
            >
              Inbound messages off
            </Badge>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-full text-[11px]"
            onClick={() => void onSetupInboundWebhooks()}
            disabled={isSettingUpWebhooks || webhookUsesLocalhost}
          >
            {isSettingUpWebhooks ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Zap className="size-3.5" />
            )}
            Enable inbound messages
          </Button>
        </div>
      </div>

      {webhookUsesLocalhost || !inboundMessagesEnabled ? (
        <Alert className="py-2 border-amber-500/30 bg-amber-500/10">
          <AlertTitle className="text-xs text-amber-200">
            Incoming WhatsApp texts are not reaching this server
          </AlertTitle>
          <AlertDescription className="text-[11px] text-amber-100/90 space-y-2">
            <p>
              Outbound works, but Meta delivers inbound messages to your{" "}
              <span className="font-semibold">public webhook URL</span>, not localhost.
              If you use ngrok, its URL changes every restart — Meta may still be sending to an
              old dead URL.
            </p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>
                Run <code className="font-mono">ngrok http 5000</code> (or use{" "}
                <code className="font-mono">https://api.technov.me</code> in production)
              </li>
              <li>
                Set <code className="font-mono">PUBLIC_API_URL</code> in backend{" "}
                <code className="font-mono">.env</code> to that https URL
              </li>
              <li>Restart backend, then click Enable inbound messages</li>
              <li>
                Text your business number — look for{" "}
                <code className="font-mono">[Webhook] POST</code> in backend logs
              </li>
            </ol>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {activeConnections.map((conn) => (
          <WhatsAppConnectionCard
            key={conn.phoneNumberId}
            conn={conn}
            isSuperAdmin={isSuperAdmin}
            isDisconnecting={isDisconnecting}
            onDisconnect={onDisconnect}
          />
        ))}
      </div>
    </div>
  )
}
