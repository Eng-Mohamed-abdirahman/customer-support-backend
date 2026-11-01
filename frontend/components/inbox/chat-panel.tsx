"use client"

import { Loader2, MessageSquare } from "lucide-react"
import type { FormEvent } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ConversationMessageRecord, ConversationRecord } from "@/types/conversation"

import { formatMessageTime } from "./inbox-utils"

type MessageGroup = { date: string; messages: ConversationMessageRecord[] }

type ChatPanelProps = {
  selectedConversation: ConversationRecord | null
  displayName: string
  sessionActive: boolean
  messages: ConversationMessageRecord[]
  groupedMessages: MessageGroup[]
  messagesLoading: boolean
  messagesError: string | null
  actionError: string | null
  takeoverLoading: boolean
  returnToAiLoading: boolean
  onTakeover: () => Promise<void>
  onReturnToAi: () => Promise<void>
  agentMessage: string
  onAgentMessageChange: (value: string) => void
  agentMessageLoading: boolean
  agentMessageError: string | null
  canReply: boolean
  onSendMessage: (event: FormEvent) => void
}

export function ChatPanel({
  selectedConversation,
  displayName,
  sessionActive,
  messages,
  groupedMessages,
  messagesLoading,
  messagesError,
  actionError,
  takeoverLoading,
  returnToAiLoading,
  onTakeover,
  onReturnToAi,
  agentMessage,
  onAgentMessageChange,
  agentMessageLoading,
  agentMessageError,
  canReply,
  onSendMessage,
}: ChatPanelProps) {
  return (
    <div className="flex min-h-0 flex-col border-b border-border/60 lg:border-b-0 lg:border-r">
      {selectedConversation ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{displayName}</h2>
                {selectedConversation.channel === "whatsapp" ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      sessionActive
                        ? "border-emerald-500/40 text-emerald-500"
                        : "border-rose-500/40 text-rose-500"
                    )}
                  >
                    {sessionActive ? "Active" : "Expired"}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">{selectedConversation.customerPhone}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedConversation.status}
                className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs"
                disabled
              >
                <option value={selectedConversation.status}>
                  {selectedConversation.status.charAt(0).toUpperCase() +
                    selectedConversation.status.slice(1)}
                </option>
              </select>

              {selectedConversation.responderType === "agent" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void onReturnToAi()}
                  disabled={returnToAiLoading}
                >
                  {returnToAiLoading ? <Loader2 className="size-4 animate-spin" /> : "Return to AI"}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => void onTakeover()} disabled={takeoverLoading}>
                  {takeoverLoading ? <Loader2 className="size-4 animate-spin" /> : "Take Over"}
                </Button>
              )}
            </div>
          </div>

          {actionError ? (
            <div className="px-5 pt-3">
              <p className="text-sm text-destructive">{actionError}</p>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {messagesError ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to load messages</AlertTitle>
                <AlertDescription>{messagesError}</AlertDescription>
              </Alert>
            ) : messagesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-2/3 rounded-2xl" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No messages in this thread yet.</p>
            ) : (
              <div className="space-y-4">
                {groupedMessages.map((group) => (
                  <div key={group.date} className="space-y-3">
                    <p className="text-center text-xs text-muted-foreground">{group.date}</p>
                    {group.messages.map((message) => (
                      <ChatMessage key={message._id} message={message} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!sessionActive && selectedConversation.channel === "whatsapp" ? (
            <div className="border-t border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm text-amber-200">
              24-hour session expired. Use a template to re-engage.
            </div>
          ) : null}

          <div className="border-t border-border/60 p-4">
            {agentMessageError ? (
              <p className="mb-2 text-sm text-destructive">{agentMessageError}</p>
            ) : null}
            <form onSubmit={onSendMessage} className="flex gap-2">
              <Input
                value={agentMessage}
                onChange={(event) => onAgentMessageChange(event.target.value)}
                placeholder={
                  sessionActive
                    ? selectedConversation.responderType === "agent"
                      ? "Type a message..."
                      : "Take over to reply, or send to auto-takeover..."
                    : "Session expired - use a template"
                }
                disabled={!sessionActive}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!canReply || agentMessageLoading || !agentMessage.trim()}
              >
                {agentMessageLoading ? <Loader2 className="size-4 animate-spin" /> : "Send"}
              </Button>
            </form>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
          <MessageSquare className="size-10 opacity-40" />
          <p>Select a conversation to view messages</p>
        </div>
      )}
    </div>
  )
}

function ChatMessage({ message }: { message: ConversationMessageRecord }) {
  if (message.senderType === "system") {
    return (
      <p
        className="text-center text-xs text-muted-foreground"
      >
        {message.contentText}
      </p>
    )
  }

  const isOutgoing =
    message.senderType === "agent" || message.senderType === "assistant"

  return (
    <div
      className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
          isOutgoing
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-muted text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap">
          {message.messageType === "text"
            ? message.contentText || "(No text)"
            : `[${message.messageType}]`}
        </p>
        <p
          className={cn(
            "mt-1 text-[10px]",
            isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  )
}
