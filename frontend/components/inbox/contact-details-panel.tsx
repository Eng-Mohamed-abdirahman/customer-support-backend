"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { ContactRecord } from "@/types/contact"
import type { ConversationRecord } from "@/types/conversation"

import { getInitials } from "./inbox-utils"

type ContactDetailsPanelProps = {
  selectedConversation: ConversationRecord | null
  displayName: string
  contact: ContactRecord | null
  contactLoading: boolean
  noteDraft: string
  onNoteDraftChange: (value: string) => void
  noteSaving: boolean
  onSaveNote: () => Promise<void>
}

export function ContactDetailsPanel({
  selectedConversation,
  displayName,
  contact,
  contactLoading,
  noteDraft,
  onNoteDraftChange,
  noteSaving,
  onSaveNote,
}: ContactDetailsPanelProps) {
  return (
    <div className="flex min-h-0 flex-col overflow-y-auto p-5">
      {selectedConversation ? (
        contactLoading ? (
          <div className="space-y-3">
            <Skeleton className="mx-auto size-20 rounded-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/15 text-2xl font-semibold text-primary">
                {getInitials(displayName)}
              </div>
              <h3 className="mt-3 text-lg font-semibold">{displayName}</h3>
              <p className="text-sm text-muted-foreground">{selectedConversation.customerPhone}</p>
              {contact?.email ? (
                <p className="mt-1 text-sm text-muted-foreground">{contact.email}</p>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </p>
              {contact?.tags?.length ? (
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tags</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </p>
              {contact ? (
                <div className="space-y-2">
                  <textarea
                    value={noteDraft}
                    onChange={(event) => onNoteDraftChange(event.target.value)}
                    placeholder="Add a note..."
                    rows={4}
                    className="w-full resize-none rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onSaveNote()}
                    disabled={noteSaving || noteDraft === (contact.notes ?? "")}
                  >
                    {noteSaving ? <Loader2 className="size-4 animate-spin" /> : "Save note"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Contact not in your list yet.</p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/contacts">Add to contacts</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <p className="text-center text-sm text-muted-foreground">Contact details appear here</p>
      )}
    </div>
  )
}
