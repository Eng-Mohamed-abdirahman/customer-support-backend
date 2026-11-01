"use client"

import { CheckCircle2, Clock, Loader2, MessageSquare } from "lucide-react"
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
                className="h-11 rounded-[10px] border-[1.5px] border-border bg-white px-3 text-sm font-medium"
                disabled
              >
                <option value={selectedConversation.status}>
                  {selectedConversation.status.charAt(0).toUpperCase() +
                    selectedConversation.status.slice(1)}
                </option>
              </select>

              {selectedConversation.responderType === "agent" ? (
                <Button variant="outline" onClick={() => void onReturnToAi()} disabled={returnToAiLoading}>
                  {returnToAiLoading ? <Loader2 className="size-4 animate-spin" /> : "Return to AI"}
                </Button>
              ) : (
                <Button onClick={() => void onTakeover()} disabled={takeoverLoading}>
                  {takeoverLoading ? <Loader2 className="size-4 animate-spin" /> : "Take over chat"}
                </Button>
              )}
            </div>
          </div>

          {selectedConversation.responderType === "agent" ? (
            <div
              role="status"
              className="mx-5 mt-4 flex items-center gap-3 rounded-[10px] bg-emerald-50 px-4 py-3 text-sm text-emerald-600"
            >
              <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
              <span>
                <b>You&apos;re handling this chat.</b> The AI is paused until you return it.
              </span>
            </div>
          ) : selectedConversation.status === "pending" ? (
            <div
              role="status"
              className="mx-5 mt-4 flex items-center gap-3 rounded-[10px] bg-amber-50 px-4 py-3 text-sm text-amber-600"
            >
              <Clock className="size-5 shrink-0" aria-hidden="true" />
              <span>
                <b>Customer asked for a person.</b> Take over to reply.
              </span>
            </div>
          ) : null}

          {actionError ? (
            <div className="px-5 pt-3">
              <p className="text-sm text-destructive">{actionError}</p>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted px-5 py-4">
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
            <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-600">
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
      <p className="mx-auto w-fit rounded-full bg-navy-50 px-3 py-1.5 text-center text-xs font-semibold text-navy-600">
        {message.contentText}
      </p>
    )
  }

  const isOutgoing =
    message.senderType === "agent" || message.senderType === "assistant"

  // Customer: white bubble · AI: Deep Navy · human agent: navy-600, so agents can tell them apart.
  return (
    <div
      className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
          isOutgoing
            ? cn(
                "rounded-br-[4px] text-white",
                message.senderType === "agent" ? "bg-navy-600" : "bg-navy-800"
              )
            : "rounded-bl-[4px] bg-white text-navy-800 shadow-e1"
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
