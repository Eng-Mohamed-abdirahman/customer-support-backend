"use client"

import { Loader2 } from "lucide-react"
import type { FormEvent } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ConversationMessageRecord, ConversationRecord } from "@/types/conversation"
import type { TicketRecord } from "@/types/ticket"

import { formatChannelLabel, formatDateTime, messageBubbleStyles } from "./ticket-utils"

type TicketConversationBodyProps = {
  selectedTicket: TicketRecord | null
  selectedConversation: ConversationRecord | null
  messages: ConversationMessageRecord[]
  messagesLoading: boolean
  messagesError: string | null
  takeoverError: string | null
  returnToAiError: string | null
  statusUpdateError: string | null
}

export function TicketConversationBody({
  selectedTicket,
  selectedConversation,
  messages,
  messagesLoading,
  messagesError,
  takeoverError,
  returnToAiError,
  statusUpdateError,
}: TicketConversationBodyProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
      {takeoverError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Takeover failed</AlertTitle>
          <AlertDescription>{takeoverError}</AlertDescription>
        </Alert>
      ) : null}
      {returnToAiError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Return to AI failed</AlertTitle>
          <AlertDescription>{returnToAiError}</AlertDescription>
        </Alert>
      ) : null}
      {statusUpdateError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Ticket status update failed</AlertTitle>
          <AlertDescription>{statusUpdateError}</AlertDescription>
        </Alert>
      ) : null}

      {!selectedTicket ? (
        <Alert>
          <AlertTitle>No ticket selected</AlertTitle>
          <AlertDescription>Select a ticket to load the conversation history.</AlertDescription>
        </Alert>
      ) : messagesError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load messages</AlertTitle>
          <AlertDescription>{messagesError}</AlertDescription>
        </Alert>
      ) : messagesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-xs text-muted-foreground">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="uppercase tracking-[0.12em]">Channel</p>
                <p className="text-sm text-foreground">
                  {formatChannelLabel(selectedConversation?.channel)}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-[0.12em]">Assigned agent</p>
                <p className="text-sm text-foreground">
                  {selectedConversation?.assignedAgent ?? "Unassigned"}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-[0.12em]">Customer</p>
                <p className="text-sm text-foreground">
                  {selectedTicket.customerName || selectedTicket.customerPhone || "Unknown"}
                </p>
              </div>
              <div>
                <p className="uppercase tracking-[0.12em]">Created</p>
                <p className="text-sm text-foreground">
                  {formatDateTime(selectedTicket.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {messages.length === 0 ? (
            <Alert>
              <AlertTitle>No messages yet</AlertTitle>
              <AlertDescription>This ticket has no stored conversation messages.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-5">
              {messages.map((message) => (
                <TicketMessageBubble key={message._id} message={message} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TicketMessageBubble({ message }: { message: ConversationMessageRecord }) {
  const bubbleClass =
    messageBubbleStyles[message.senderType] ?? messageBubbleStyles.customer
  const isCustomer = message.senderType === "customer"

  return (
    <div
      className={cn("flex", isCustomer ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl border px-4 py-3 text-sm shadow-sm",
          bubbleClass,
          isCustomer ? "rounded-tr-none" : "rounded-tl-none"
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em]",
            isCustomer ? "text-primary-foreground/75" : "text-muted-foreground"
          )}
        >
          <span>{message.senderType}</span>
          <span>{formatDateTime(message.createdAt)}</span>
        </div>
        {message.messageType === "text" ? (
          <p className="mt-2 whitespace-pre-wrap text-sm">
            {message.contentText || "(No text)"}
          </p>
        ) : (
          <div className="mt-2 space-y-2 text-sm">
            <p>
              Media: {message.messageType}
              {message.media?.fileName ? ` - ${message.media.fileName}` : ""}
            </p>
            {message.media?.caption ? (
              <p className="text-xs text-muted-foreground">
                Caption: {message.media.caption}
              </p>
            ) : null}
            {message.media?.url ? (
              <a
                href={message.media.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline"
              >
                View media
              </a>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

type TicketReplyComposerProps = {
  selectedConversation: ConversationRecord | null
  agentMessage: string
  onAgentMessageChange: (value: string) => void
  agentMessageLoading: boolean
  agentMessageError: string | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function TicketReplyComposer({
  selectedConversation,
  agentMessage,
  onAgentMessageChange,
  agentMessageLoading,
  agentMessageError,
  onSubmit,
}: TicketReplyComposerProps) {
  if (selectedConversation?.aiEnabled !== false) {
    return (
      <div className="border-t border-border/60 bg-muted/40 px-6 py-4 text-xs text-muted-foreground">
        Enable takeover to chat with this customer in real time.
      </div>
    )
  }

  return (
    <div className="border-t border-border/60 bg-background/80 px-6 py-4">
      <form onSubmit={onSubmit} className="space-y-3">
        {agentMessageError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to send message</AlertTitle>
            <AlertDescription>{agentMessageError}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={agentMessage}
            onChange={(event) => onAgentMessageChange(event.target.value)}
            placeholder="Type a reply to the customer..."
            className="flex-1"
          />
          <Button type="submit" className="gap-2" disabled={agentMessageLoading}>
            {agentMessageLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}
