import { Request, Response } from "express";

import mongoose from "mongoose";
import Contact from "../models/Contact";
import { apiResponse } from "../utils/apiResponse";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { normalizePhone, syncContactsFromConversations } from "../services/contact.service";
import { createContactSchema, updateContactSchema, listContactsSchema } from "../validators/contact.validator";

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const resolveOrganizationId = (req: Request): string => {
  const requester = (req as any).user;
  const organizationId =
    normalizeText(requester?.accountId) ||
    normalizeText(requester?.organizationId) ||
    normalizeText(requester?.company);

  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new AppError("Organization context is missing for this user", 400);
  }

  return String(organizationId);
};

const listContacts = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const parsed = listContactsSchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const { search, limit = 50, skip = 0 } = parsed.data;

  await syncContactsFromConversations(organizationId);

  const query: Record<string, unknown> = { organizationId };

  if (search) {
    const term = search.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: regex }, { phone: regex }, { email: regex }, { company: regex }];
  }

  const [contacts, total] = await Promise.all([
    Contact.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Contact.countDocuments(query),
  ]);

  apiResponse(res, 200, "Contacts retrieved successfully", {
    contacts,
    total,
    limit,
    skip,
  });
});

const getContactByPhone = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const phone = normalizePhone(req.params?.phone);
  const rawPhone = normalizeText(req.params?.phone).replace(/^\+/, "");

  if (!phone) {
    throw new AppError("Phone number is required", 400);
  }

  const contact = await Contact.findOne({
    organizationId,
    $or: [{ phone }, { phone: rawPhone }, { phone: `+${rawPhone}` }],
  }).lean();

  if (!contact) {
    throw new AppError("Contact not found", 404);
  }

  apiResponse(res, 200, "Contact retrieved successfully", { contact });
});

const createContact = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const parsed = createContactSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const phone = normalizePhone(parsed.data.phone);
  const email = normalizeText(parsed.data.email).toLowerCase();

  const existing = await Contact.findOne({ organizationId, phone });
  if (existing) {
    throw new AppError("A contact with this phone number already exists", 409);
  }

  const contact = await Contact.create({
    organizationId,
    name: parsed.data.name,
    phone,
    email,
    company: normalizeText(parsed.data.company),
    tags: parsed.data.tags ?? [],
    notes: normalizeText(parsed.data.notes),
    source: "manual",
  });

  apiResponse(res, 201, "Contact created successfully", { contact });
});

const updateContact = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const contactId = normalizeText(req.params?.id);

  if (!contactId || !mongoose.Types.ObjectId.isValid(contactId)) {
    throw new AppError("Contact not found", 404);
  }

  const parsed = updateContactSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const contact = await Contact.findOne({ _id: contactId, organizationId });

  if (!contact) {
    throw new AppError("Contact not found", 404);
  }

  if (parsed.data.name !== undefined) {
    contact.name = parsed.data.name;
  }

  if (parsed.data.phone !== undefined) {
    const phone = normalizePhone(parsed.data.phone);
    const duplicate = await Contact.findOne({
      organizationId,
      phone,
      _id: { $ne: contactId },
    });

    if (duplicate) {
      throw new AppError("A contact with this phone number already exists", 409);
    }

    contact.phone = phone;
  }

  if (parsed.data.email !== undefined) {
    contact.email = normalizeText(parsed.data.email).toLowerCase();
  }

  if (parsed.data.company !== undefined) {
    contact.company = normalizeText(parsed.data.company);
  }

  if (parsed.data.tags !== undefined) {
    contact.tags = parsed.data.tags;
  }

  if (parsed.data.notes !== undefined) {
    contact.notes = normalizeText(parsed.data.notes);
  }

  await contact.save();

  apiResponse(res, 200, "Contact updated successfully", { contact });
});

const deleteContact = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const contactId = normalizeText(req.params?.id);

  if (!contactId || !mongoose.Types.ObjectId.isValid(contactId)) {
    throw new AppError("Contact not found", 404);
  }

  const contact = await Contact.findOneAndDelete({ _id: contactId, organizationId });

  if (!contact) {
    throw new AppError("Contact not found", 404);
  }

  apiResponse(res, 200, "Contact deleted successfully", { contactId });
});

export {
  listContacts,
  getContactByPhone,
  createContact,
  updateContact,
  deleteContact,
};

