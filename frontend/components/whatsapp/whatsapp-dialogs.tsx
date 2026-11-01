"use client"

import { CheckCircle2, ClipboardCopy, Loader2, Unlink } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { EmbeddedSignupVerifyToken, WhatsAppConnection } from "@/types/whatsapp"

type WhatsAppDisconnectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  disconnectTarget: WhatsAppConnection | null
  isDisconnecting: boolean
  onDisconnect: () => void
}

export function WhatsAppDisconnectDialog({
  open,
  onOpenChange,
  disconnectTarget,
  isDisconnecting,
  onDisconnect,
}: WhatsAppDisconnectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="gap-2 rounded-xl"
            onClick={onDisconnect}
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
  )
}

type WhatsAppVerifyTokensDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  verifyTokens: EmbeddedSignupVerifyToken[]
  copiedField: string | null
  copyToClipboard: (text: string, field: string) => Promise<void>
}

export function WhatsAppVerifyTokensDialog({
  open,
  onOpenChange,
  verifyTokens,
  copiedField,
  copyToClipboard,
}: WhatsAppVerifyTokensDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  )
}
