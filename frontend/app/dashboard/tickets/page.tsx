"use client"

import { AlertCircle, Loader2, RefreshCw } from "lucide-react"

import {
  TicketConversationBody,
  TicketReplyComposer,
} from "@/components/tickets/ticket-conversation"
import { TicketDetailHeader } from "@/components/tickets/ticket-detail-header"
import { TicketList } from "@/components/tickets/ticket-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useTickets } from "@/hooks/useTickets"

export default function TicketsPage() {
  const {
    isLoading,
    isRefreshing,
    loadError,
    tickets,
    statusFilter,
    setStatusFilter,
    selectedTicket,
    messages,
    messagesLoading,
    messagesError,
    agentMessage,
    setAgentMessage,
    agentMessageLoading,
    agentMessageError,
    takeoverLoading,
    takeoverError,
    returnToAiLoading,
    returnToAiError,
    statusUpdateLoading,
    statusUpdateError,
    loadTickets,
    openTicketConversation,
    handleSelectTicket,
    handleTakeoverConversation,
    handleReturnConversationToAi,
    handleStatusChange,
    handleSendAgentMessage,
    ticketCountLabel,
    selectedConversation,
  } = useTickets()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace / Tickets
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Tickets</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Review human handoff requests created from live conversations.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-9 gap-2"
          onClick={() => void loadTickets(true)}
          disabled={isLoading || isRefreshing}
        >
          {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </header>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load tickets</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <TicketList
          isLoading={isLoading}
          tickets={tickets}
          ticketCountLabel={ticketCountLabel}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          selectedTicketId={selectedTicket?._id}
          onSelectTicket={handleSelectTicket}
        />

        <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/95 shadow-sm">
          <TicketDetailHeader
            selectedTicket={selectedTicket}
            selectedConversation={selectedConversation}
            onOpenConversation={openTicketConversation}
            onStatusChange={handleStatusChange}
            statusUpdateLoading={statusUpdateLoading}
            onReturnToAi={handleReturnConversationToAi}
            returnToAiLoading={returnToAiLoading}
            onTakeover={handleTakeoverConversation}
            takeoverLoading={takeoverLoading}
          />

          <TicketConversationBody
            selectedTicket={selectedTicket}
            selectedConversation={selectedConversation}
            messages={messages}
            messagesLoading={messagesLoading}
            messagesError={messagesError}
            takeoverError={takeoverError}
            returnToAiError={returnToAiError}
            statusUpdateError={statusUpdateError}
          />

          {selectedTicket ? (
            <TicketReplyComposer
              selectedConversation={selectedConversation}
              agentMessage={agentMessage}
              onAgentMessageChange={setAgentMessage}
              agentMessageLoading={agentMessageLoading}
              agentMessageError={agentMessageError}
              onSubmit={handleSendAgentMessage}
            />
          ) : null}
        </div>
      </section>
    </div>
  )
}
