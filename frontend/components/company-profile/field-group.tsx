import { Label } from "@/components/ui/label"

/* ─── Reusable field group component ─── */
export function FieldGroup({
  id,
  label,
  icon: Icon,
  required,
  hint,
  children,
}: {
  id: string
  label: string
  icon: React.ElementType
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </Label>
      </div>
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
      {children}
    </div>
  )
}

/* ─── Reusable feature toggle component ─── */
export function FeatureToggle({
  id,
  label,
  description,
  enabled,
  onChange,
}: {
  id: string
  label: string
  description: string
  enabled: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
      <div className="flex-1 space-y-1 pr-4">
        <label htmlFor={id} className="text-sm font-semibold text-foreground cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          enabled ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`pointer-events-none block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}
