"use client"

import {
  CheckCircle2,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Zap,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WhatsAppConnectedNumbers } from "@/components/whatsapp/whatsapp-connected-numbers"
import {
  WhatsAppDisconnectDialog,
  WhatsAppVerifyTokensDialog,
} from "@/components/whatsapp/whatsapp-dialogs"
import { WhatsAppEmbeddedSignupTab } from "@/components/whatsapp/whatsapp-embedded-signup-tab"
import { WhatsAppManualSetupTab } from "@/components/whatsapp/whatsapp-manual-setup-tab"
import { statusConfig } from "@/components/whatsapp/whatsapp-utils"
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection"
import { cn } from "@/lib/utils"

export function WhatsAppConnectionPanel({ organizationId }: { organizationId?: string } = {}) {
  const wa = useWhatsAppConnection(organizationId)

  const cfg = statusConfig[wa.overallStatus] ?? statusConfig.disconnected

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
              onClick={() => void wa.loadStatus(true)}
              disabled={wa.isLoading || wa.isRefreshing}
            >
              {wa.isRefreshing ? (
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
          {wa.loadError && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{wa.loadError}</AlertDescription>
            </Alert>
          )}
          {wa.successMessage && (
            <Alert className="border-emerald-500/30 bg-emerald-500/5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <AlertTitle className="text-emerald-700 dark:text-emerald-400">
                Success
              </AlertTitle>
              <AlertDescription className="text-emerald-600 dark:text-emerald-300">
                {wa.successMessage}
              </AlertDescription>
            </Alert>
          )}

          {wa.isLoading ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-2xl bg-muted/50" />
              <div className="h-48 animate-pulse rounded-2xl bg-muted/50" />
            </div>
          ) : (
            <>
              {/* ─── Connected Numbers ─── */}
              {wa.activeConnections.length > 0 && (
                <WhatsAppConnectedNumbers
                  activeConnections={wa.activeConnections}
                  inboundMessagesEnabled={wa.inboundMessagesEnabled}
                  webhookUsesLocalhost={wa.webhookUsesLocalhost}
                  isSettingUpWebhooks={wa.isSettingUpWebhooks}
                  isSuperAdmin={wa.isSuperAdmin}
                  isDisconnecting={wa.isDisconnecting}
                  onSetupInboundWebhooks={wa.handleSetupInboundWebhooks}
                  onDisconnect={wa.requestDisconnect}
                />
              )}

              {/* ─── Connection Methods (Super Admin Only) ─── */}
              {wa.isSuperAdmin && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">
                      {wa.activeConnections.length > 0 ? "Add Another Number" : "Connect WhatsApp"}
                    </h3>
                  </div>

                  <Tabs value={wa.activeTab} onValueChange={wa.setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted p-1">
                      <TabsTrigger
                        value="embedded"
                        className="rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        Meta Embedded Signup
                      </TabsTrigger>
                      <TabsTrigger
                        value="manual"
                        className="rounded-xl py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        Manual Configuration
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="embedded" className="mt-4">
                      <WhatsAppEmbeddedSignupTab
                        hasMetaEnvVars={wa.hasMetaEnvVars}
                        isConnecting={wa.isConnecting}
                        isSdkReady={wa.isSdkReady}
                        sdkError={wa.sdkError}
                        onEmbeddedSignup={wa.handleEmbeddedSignup}
                      />
                    </TabsContent>

                    <TabsContent value="manual" className="mt-4">
                      <WhatsAppManualSetupTab
                        manualForm={wa.manualForm}
                        setManualForm={wa.setManualForm}
                        manualErrors={wa.manualErrors}
                        webhookUrl={wa.webhookUrl}
                        webhookUsesLocalhost={wa.webhookUsesLocalhost}
                        webhookStatus={wa.webhookStatus}
                        copiedField={wa.copiedField}
                        copyToClipboard={wa.copyToClipboard}
                        isManualConnecting={wa.isManualConnecting}
                        onManualConnect={wa.handleManualConnect}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Disconnect Dialog ─── */}
      <WhatsAppDisconnectDialog
        open={wa.showDisconnectConfirm}
        onOpenChange={wa.setShowDisconnectConfirm}
        disconnectTarget={wa.disconnectTarget}
        isDisconnecting={wa.isDisconnecting}
        onDisconnect={wa.handleDisconnect}
      />

      {/* ─── Verify Tokens Dialog ─── */}
      <WhatsAppVerifyTokensDialog
        open={wa.showVerifyTokens}
        onOpenChange={wa.setShowVerifyTokens}
        verifyTokens={wa.verifyTokens}
        copiedField={wa.copiedField}
        copyToClipboard={wa.copyToClipboard}
      />
    </div>
  )
}
