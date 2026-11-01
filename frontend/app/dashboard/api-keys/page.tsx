import { ApiKeysPanel } from "@/components/dashboard/api-keys-panel"

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace / Security
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            API Keys
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Generate and revoke API keys for your workspace integrations.
          </p>
        </div>
      </header>

      <ApiKeysPanel />
    </div>
  )
}
