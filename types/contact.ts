export type ContactRecord = {
  _id: string
  organizationId: string
  name: string
  phone: string
  email?: string
  company?: string
  tags?: string[]
  notes?: string
  source?: "manual" | "whatsapp"
  createdAt?: string
  updatedAt?: string
}

export type ContactListResult = {
  contacts: ContactRecord[]
  total: number
  limit: number
  skip: number
}

export type CreateContactInput = {
  name: string
  phone: string
  email?: string
  company?: string
  tags?: string[]
  notes?: string
}

export type UpdateContactInput = Partial<CreateContactInput>
