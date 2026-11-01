"use client"

import { Loader2, MoreHorizontal, Plus, Search, Upload, Users } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import { AddContactDialog } from "@/components/contacts/add-contact-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { deleteContact, listContacts } from "@/services/contact.service"
import type { ContactRecord } from "@/types/contact"

const formatDate = (value?: string) => {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadData = useCallback(async (search?: string) => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const result = await listContacts({
        search: search?.trim() || undefined,
        limit: 100,
      })
      setContacts(result.contacts)
      setTotal(result.total)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load contacts"
      setLoadError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadData(searchTerm)
    }, 300)

    return () => clearTimeout(timeout)
  }, [loadData, searchTerm])

  const displayCount = useMemo(() => total || contacts.length, [contacts.length, total])

  const handleDelete = async (contactId: string) => {
    setDeletingId(contactId)

    try {
      await deleteContact(contactId)
      setContacts((prev) => prev.filter((contact) => contact._id !== contactId))
      setTotal((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Failed to delete contact", error)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-9 font-bold text-navy-800 sm:text-[32px] sm:leading-10">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your contact list. {displayCount} total contacts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" disabled>
            <Upload className="size-4" />
            Import
          </Button>
          <Button className="gap-2" onClick={() => setIsAddOpen(true)}>
            <Plus className="size-4" />
            Add Contact
          </Button>
        </div>
      </header>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by name, phone, or email..."
          className="pl-9"
        />
      </div>

      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/95">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="size-8 opacity-50" />
                      <p>No contacts yet. Add your first contact or connect WhatsApp.</p>
                      <Button size="sm" onClick={() => setIsAddOpen(true)}>
                        <Plus className="size-4" />
                        Add Contact
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow key={contact._id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{contact.phone}</TableCell>
                    <TableCell>{contact.email || "-"}</TableCell>
                    <TableCell>{contact.company || "-"}</TableCell>
                    <TableCell>
                      {contact.tags?.length ? contact.tags.join(", ") : "-"}
                    </TableCell>
                    <TableCell>{formatDate(contact.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/inbox?phone=${encodeURIComponent(contact.phone)}`}>
                            Message
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={deletingId === contact._id}
                          onClick={() => void handleDelete(contact._id)}
                        >
                          {deletingId === contact._id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="size-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AddContactDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onCreated={(contact) => {
          setContacts((prev) => [contact, ...prev])
          setTotal((prev) => prev + 1)
        }}
      />
    </div>
  )
}
