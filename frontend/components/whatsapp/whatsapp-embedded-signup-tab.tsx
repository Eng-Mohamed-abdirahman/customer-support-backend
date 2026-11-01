"use client"

import { CheckCircle2, Globe, Loader2, Shield, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

type WhatsAppEmbeddedSignupTabProps = {
  hasMetaEnvVars: boolean
  isConnecting: boolean
  isSdkReady: boolean
  sdkError: string | null
  onEmbeddedSignup: () => void
}

export function WhatsAppEmbeddedSignupTab({
  hasMetaEnvVars,
  isConnecting,
  isSdkReady,
  sdkError,
  onEmbeddedSignup,
}: WhatsAppEmbeddedSignupTabProps) {
  return (
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
            onClick={onEmbeddedSignup}
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
  )
}
