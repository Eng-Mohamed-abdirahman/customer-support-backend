"use client"

import { Unlink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { WhatsAppConnection } from "@/types/whatsapp"

import {
  formatDateTime,
  formatRelative,
  statusConfig,
  webhookStatusConfig,
} from "./whatsapp-utils"

type WhatsAppConnectionCardProps = {
  conn: WhatsAppConnection
  isSuperAdmin: boolean
  isDisconnecting: boolean
  onDisconnect: (conn: WhatsAppConnection) => void
}

export function WhatsAppConnectionCard({
  conn,
  isSuperAdmin,
  isDisconnecting,
  onDisconnect,
}: WhatsAppConnectionCardProps) {
  const st = statusConfig[conn.status ?? "disconnected"] ?? statusConfig.disconnected
  const wh = webhookStatusConfig[conn.webhookSubscriptionStatus ?? "unknown"] ?? webhookStatusConfig.unknown

  return (
    <div
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
          {isSuperAdmin && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-full px-3 text-[11px] text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              onClick={() => onDisconnect(conn)}
              disabled={isDisconnecting}
            >
              <Unlink className="size-3" />
              Disconnect
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
