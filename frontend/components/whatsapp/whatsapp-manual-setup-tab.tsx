"use client"

import { CheckCircle2, ClipboardCopy, Globe, KeyRound, Link2, Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { WhatsAppWebhookStatus } from "@/types/whatsapp"

import type { ManualFormState } from "./whatsapp-utils"

type WhatsAppManualSetupTabProps = {
  manualForm: ManualFormState
  setManualForm: (form: ManualFormState) => void
  manualErrors: Record<string, string>
  webhookUrl: string
  webhookUsesLocalhost: boolean
  webhookStatus: WhatsAppWebhookStatus | null
  copiedField: string | null
  copyToClipboard: (text: string, field: string) => Promise<void>
  isManualConnecting: boolean
  onManualConnect: () => void
}

export function WhatsAppManualSetupTab({
  manualForm,
  setManualForm,
  manualErrors,
  webhookUrl,
  webhookUsesLocalhost,
  webhookStatus,
  copiedField,
  copyToClipboard,
  isManualConnecting,
  onManualConnect,
}: WhatsAppManualSetupTabProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-background to-muted/10 p-6 space-y-4 text-left">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <KeyRound className="size-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Manual Credentials
          </h4>
          <p className="text-xs text-muted-foreground">
            Input your WhatsApp Cloud API credentials manually if you prefer not to use the automated signup.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wabaId" className="text-xs font-semibold">WhatsApp Business Account ID (WABA ID) *</Label>
          <Input
            id="wabaId"
            placeholder="e.g. 1098237492374"
            value={manualForm.wabaId}
            onChange={(e) => setManualForm({ ...manualForm, wabaId: e.target.value })}
            className={cn("h-9 rounded-xl text-xs", manualErrors.wabaId && "border-rose-500")}
          />
          {manualErrors.wabaId && <p className="text-[10px] text-rose-500 font-medium">{manualErrors.wabaId}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="businessName" className="text-xs font-semibold">Business Display Name</Label>
          <Input
            id="businessName"
            placeholder="e.g. Acme Support"
            value={manualForm.businessName}
            onChange={(e) => setManualForm({ ...manualForm, businessName: e.target.value })}
            className="h-9 rounded-xl text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phoneNumberId" className="text-xs font-semibold">Phone Number ID *</Label>
          <Input
            id="phoneNumberId"
            placeholder="e.g. 1023948290384"
            value={manualForm.phoneNumberId}
            onChange={(e) => setManualForm({ ...manualForm, phoneNumberId: e.target.value })}
            className={cn("h-9 rounded-xl text-xs", manualErrors.phoneNumberId && "border-rose-500")}
          />
          {manualErrors.phoneNumberId && <p className="text-[10px] text-rose-500 font-medium">{manualErrors.phoneNumberId}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="displayPhoneNumber" className="text-xs font-semibold">Display Phone Number</Label>
          <Input
            id="displayPhoneNumber"
            placeholder="e.g. +1 (555) 019-2834"
            value={manualForm.displayPhoneNumber}
            onChange={(e) => setManualForm({ ...manualForm, displayPhoneNumber: e.target.value })}
            className="h-9 rounded-xl text-xs"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="accessToken" className="text-xs font-semibold">Permanent System User Access Token *</Label>
          <Input
            id="accessToken"
            type="password"
            placeholder="EAAGz..."
            value={manualForm.accessToken}
            onChange={(e) => setManualForm({ ...manualForm, accessToken: e.target.value })}
            className={cn("h-9 rounded-xl text-xs", manualErrors.accessToken && "border-rose-500")}
          />
          {manualErrors.accessToken && <p className="text-[10px] text-rose-500 font-medium">{manualErrors.accessToken}</p>}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="verifyToken" className="text-xs font-semibold">Webhook Verify Token *</Label>
          <Input
            id="verifyToken"
            placeholder="Choose a secure string (min 6 chars)"
            value={manualForm.verifyToken}
            onChange={(e) => setManualForm({ ...manualForm, verifyToken: e.target.value })}
            className={cn("h-9 rounded-xl text-xs", manualErrors.verifyToken && "border-rose-500")}
          />
          {manualErrors.verifyToken && <p className="text-[10px] text-rose-500 font-medium">{manualErrors.verifyToken}</p>}
        </div>
      </div>

      {/* ─── Webhook Configuration URL ─── */}
      <div className="sm:col-span-2 rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" />
          <h5 className="text-xs font-semibold text-foreground">
            Webhook Configuration
          </h5>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Copy this URL as the <span className="font-semibold text-foreground">Callback URL</span> in
          Meta Developer Console → WhatsApp → Configuration → Webhook. Then subscribe to the{" "}
          <span className="font-semibold text-foreground">messages</span> field — without it,
          incoming WhatsApp texts will not appear in your inbox.
        </p>
        {webhookUsesLocalhost ? (
          <Alert variant="destructive" className="py-2">
            <AlertTitle className="text-xs">Public URL required</AlertTitle>
            <AlertDescription className="text-[11px]">
              Meta cannot reach localhost. Use a tunnel (ngrok) or set{" "}
              <code className="font-mono">PUBLIC_API_URL</code> on the backend to your public API URL.
            </AlertDescription>
          </Alert>
        ) : null}
        {webhookStatus && webhookStatus.failedCount > 0 ? (
          <Alert className="py-2 border-amber-500/30 bg-amber-500/10">
            <AlertTitle className="text-xs text-amber-200">
              {webhookStatus.failedCount} webhook delivery
              {webhookStatus.failedCount === 1 ? "" : "s"} failed
            </AlertTitle>
            <AlertDescription className="text-[11px] text-amber-100/90">
              {webhookStatus.recentLogs.find((log) => log.status === "failed")?.errorMessage ||
                "Check backend logs and Meta webhook configuration."}
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={webhookUrl}
            className="h-9 rounded-xl font-mono text-xs bg-background"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0 rounded-xl"
            onClick={() =>
              void copyToClipboard(webhookUrl, "webhook-url")
            }
          >
            {copiedField === "webhook-url" ? (
              <CheckCircle2 className="size-4 text-emerald-500" />
            ) : (
              <ClipboardCopy className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <Button
        type="button"
        className="w-full gap-2 rounded-xl mt-2 bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={onManualConnect}
        disabled={isManualConnecting}
      >
        {isManualConnecting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Link2 className="size-4" />
        )}
        Save WhatsApp Connection
      </Button>
    </div>
  )
}
