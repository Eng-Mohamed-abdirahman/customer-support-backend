import { MessageSquareText, PlugZap } from "lucide-react"

import { WhatsAppConnectionPanel } from "@/components/dashboard/whatsapp-connection-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace / Integrations
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Integrations
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Connect WhatsApp and other customer support channels for automated responses.
          </p>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <WhatsAppConnectionPanel />

        <div className="space-y-4">
          <Card className="border-border/70 bg-card/95">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <PlugZap className="size-4 text-primary" />
                WhatsApp workflow
              </CardTitle>
              <CardDescription>
                Incoming WhatsApp messages route through secure webhooks, validate your API key,
                and trigger AI auto-replies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Connect WhatsApp Business credentials.</p>
              <p>2. Verify the webhook using the same verify token.</p>
              <p>3. Customers message your WhatsApp number.</p>
              <p>4. AI responds using your knowledge base.</p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquareText className="size-4 text-primary" />
                Human handoff
              </CardTitle>
              <CardDescription>
                Toggle AI auto-replies per conversation in the inbox to let human agents take over
                when needed.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  )
}
