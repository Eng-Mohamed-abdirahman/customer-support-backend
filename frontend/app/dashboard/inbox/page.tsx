"use client"

import { AlertCircle, Plus, RefreshCw } from "lucide-react"
import Link from "next/link"

import { ChatPanel } from "@/components/inbox/chat-panel"
import { ContactDetailsPanel } from "@/components/inbox/contact-details-panel"
import { ConversationList } from "@/components/inbox/conversation-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useInbox } from "@/hooks/useInbox"
import { cn } from "@/lib/utils"

export default function InboxPage() {
  const {
    isLoading,
    isRefreshing,
    loadError,
    selectedConversation,
    messages,
    messagesLoading,
    messagesError,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    takeoverLoading,
    returnToAiLoading,
    actionError,
    agentMessage,
    setAgentMessage,
    agentMessageLoading,
    agentMessageError,
    contact,
    contactLoading,
    noteDraft,
    setNoteDraft,
    noteSaving,
    loadConversations,
    filteredConversations,
    sessionActive,
    groupedMessages,
    selectConversation,
    handleTakeover,
    handleReturnToAi,
    handleSendMessage,
    handleSaveNote,
    displayName,
    canReply,
  } = useInbox()

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-9 font-bold text-navy-800 sm:text-[32px] sm:leading-10">Inbox</h1>
          <p className="text-sm text-muted-foreground">WhatsApp conversations and live customer threads</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/contacts">
              <Plus className="size-4" />
              Add Contact
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void loadConversations(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load inbox</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid min-h-0 flex-1 gap-0 overflow-hidden rounded-2xl border border-border/70 bg-card/95 lg:grid-cols-[300px_1fr_280px]">
        {/* Conversation list */}
        <ConversationList
          isLoading={isLoading}
          conversations={filteredConversations}
          selectedConversationId={selectedConversation?._id}
          onSelectConversation={selectConversation}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Chat panel */}
        <ChatPanel
          selectedConversation={selectedConversation}
          displayName={displayName}
          sessionActive={sessionActive}
          messages={messages}
          groupedMessages={groupedMessages}
          messagesLoading={messagesLoading}
          messagesError={messagesError}
          actionError={actionError}
          takeoverLoading={takeoverLoading}
          returnToAiLoading={returnToAiLoading}
          onTakeover={handleTakeover}
          onReturnToAi={handleReturnToAi}
          agentMessage={agentMessage}
          onAgentMessageChange={setAgentMessage}
          agentMessageLoading={agentMessageLoading}
          agentMessageError={agentMessageError}
          canReply={canReply}
          onSendMessage={handleSendMessage}
        />

        {/* Contact details */}
        <ContactDetailsPanel
          selectedConversation={selectedConversation}
          displayName={displayName}
          contact={contact}
          contactLoading={contactLoading}
          noteDraft={noteDraft}
          onNoteDraftChange={setNoteDraft}
          noteSaving={noteSaving}
          onSaveNote={handleSaveNote}
        />
      </section>
    </div>
  )
}
