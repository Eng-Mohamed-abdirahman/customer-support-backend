"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea"
import type { CreatePlanInput, SubscriptionPlan } from "@/types/plan"

const planFormSchema = z.object({
  name: z.string().trim().min(2, "Plan name is required"),
  description: z.string().trim().optional(),
  monthlyPrice: z.coerce.number().min(0, "Price cannot be negative"),
  yearlyPrice: z.coerce.number().min(0, "Price cannot be negative"),
  maxWebsites: z.coerce.number().int().min(0),
  maxWhatsappNumbers: z.coerce.number().int().min(0),
  maxTeamMembers: z.coerce.number().int().min(0),
  maxConversations: z.coerce.number().int().min(0),
  knowledgeStorageGb: z.coerce.number().min(0.1, "Storage must be at least 0.1 GB"),
  analyticsEnabled: z.boolean(),
  knowledgeAiEnabled: z.boolean(),
  conversationSummaryEnabled: z.boolean(),
  faqInsightsEnabled: z.boolean(),
  sentimentAnalysisEnabled: z.boolean(),
  prioritySupport: z.boolean(),
  whiteLabel: z.boolean(),
  advancedSecurity: z.boolean(),
  dedicatedManager: z.boolean(),
  customBranding: z.boolean(),
  apiAccess: z.boolean(),
})

type PlanFormValues = z.infer<typeof planFormSchema>

const defaultValues: PlanFormValues = {
  name: "",
  description: "",
  monthlyPrice: 0,
  yearlyPrice: 0,
  maxWebsites: 1,
  maxWhatsappNumbers: 1,
  maxTeamMembers: 5,
  maxConversations: 2000,
  knowledgeStorageGb: 2,
  analyticsEnabled: true,
  knowledgeAiEnabled: true,
  conversationSummaryEnabled: false,
  faqInsightsEnabled: false,
  sentimentAnalysisEnabled: false,
  prioritySupport: false,
  whiteLabel: false,
  advancedSecurity: false,
  dedicatedManager: false,
  customBranding: false,
  apiAccess: false,
}

const featureToggles: Array<{
  name: keyof Pick<
    PlanFormValues,
    | "analyticsEnabled"
    | "knowledgeAiEnabled"
    | "conversationSummaryEnabled"
    | "faqInsightsEnabled"
    | "sentimentAnalysisEnabled"
    | "prioritySupport"
    | "whiteLabel"
    | "advancedSecurity"
    | "dedicatedManager"
    | "customBranding"
    | "apiAccess"
  >
  label: string
}> = [
  { name: "analyticsEnabled", label: "Analytics" },
  { name: "knowledgeAiEnabled", label: "Knowledge AI" },
  { name: "conversationSummaryEnabled", label: "Conversation Summary" },
  { name: "faqInsightsEnabled", label: "Most Asked Questions" },
  { name: "sentimentAnalysisEnabled", label: "Sentiment Analysis" },
  { name: "prioritySupport", label: "Priority Support" },
  { name: "whiteLabel", label: "White Label" },
  { name: "advancedSecurity", label: "Advanced Security" },
  { name: "dedicatedManager", label: "Dedicated Account Manager" },
  { name: "customBranding", label: "Custom Branding" },
  { name: "apiAccess", label: "API Access" },
]

function planToFormValues(plan: SubscriptionPlan): PlanFormValues {
  return {
    name: plan.name,
    description: plan.description,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    maxWebsites: plan.maxWebsites,
    maxWhatsappNumbers: plan.maxWhatsappNumbers,
    maxTeamMembers: plan.maxTeamMembers,
    maxConversations: plan.maxConversations,
    knowledgeStorageGb: plan.knowledgeStorageGb,
    analyticsEnabled: plan.analyticsEnabled,
    knowledgeAiEnabled: plan.knowledgeAiEnabled,
    conversationSummaryEnabled: plan.conversationSummaryEnabled,
    faqInsightsEnabled: plan.faqInsightsEnabled,
    sentimentAnalysisEnabled: plan.sentimentAnalysisEnabled,
    prioritySupport: plan.prioritySupport,
    whiteLabel: plan.whiteLabel,
    advancedSecurity: plan.advancedSecurity,
    dedicatedManager: plan.dedicatedManager,
    customBranding: plan.customBranding,
    apiAccess: plan.apiAccess,
  }
}

type PlanFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: SubscriptionPlan | null
  isSubmitting?: boolean
  onSubmit: (values: CreatePlanInput) => Promise<void>
}

export function PlanFormDialog({
  open,
  onOpenChange,
  plan,
  isSubmitting = false,
  onSubmit,
}: PlanFormDialogProps) {
  const isEditing = Boolean(plan)

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema) as Resolver<PlanFormValues>,
    defaultValues,
  })

  useEffect(() => {
    if (!open) return
    form.reset(plan ? planToFormValues(plan) : defaultValues)
  }, [open, plan, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Plan" : "Create Plan"}</DialogTitle>
          <DialogDescription>
            Define pricing, limits, and feature access for organizations on this
            subscription tier.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Professional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Everything growing teams need to automate support."
                        className="min-h-20 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Price</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="yearlyPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yearly Price</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-slate-900">Usage Limits</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["maxWebsites", "Maximum Websites"],
                    ["maxWhatsappNumbers", "Maximum WhatsApp Numbers"],
                    ["maxTeamMembers", "Maximum Team Members"],
                    ["maxConversations", "Conversation Limit"],
                    ["knowledgeStorageGb", "Knowledge Storage (GB)"],
                  ] as const
                ).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} step={name === "knowledgeStorageGb" ? "0.1" : "1"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-slate-900">Feature Toggles</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {featureToggles.map((toggle) => (
                  <FormField
                    key={toggle.name}
                    control={form.control}
                    name={toggle.name}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 text-sm font-medium text-slate-700">
                          {toggle.label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-[#0096c7] to-[#023e8a] text-white hover:opacity-90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Plan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
