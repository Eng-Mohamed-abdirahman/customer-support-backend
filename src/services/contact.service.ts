const Contact = require("../models/Contact");
const Conversation = require("../models/Conversation");

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizePhone = (value: unknown): string => {
  const phone = normalizeText(value);
  if (!phone) {
    return "";
  }

  return phone.startsWith("+") ? phone : `+${phone.replace(/^\+/, "")}`;
};

const upsertWhatsAppContact = async (input: {
  organizationId: string;
  phone: string;
  name?: string;
}) => {
  const phone = normalizePhone(input.phone);
  const name = normalizeText(input.name);

  if (!phone) {
    return null;
  }

  const existing = await Contact.findOne({
    organizationId: input.organizationId,
    phone,
  });

  if (existing) {
    if (name && !normalizeText(existing.name)) {
      existing.name = name;
      await existing.save();
    }
    return existing;
  }

  return Contact.create({
    organizationId: input.organizationId,
    phone,
    name: name || phone,
    source: "whatsapp",
  });
};

const syncContactsFromConversations = async (organizationId: string) => {
  const conversations = await Conversation.find({ organizationId })
    .select("customerPhone customerName channel")
    .lean();

  const uniqueByPhone = new Map<string, { phone: string; name: string }>();

  for (const conversation of conversations) {
    const phone = normalizePhone(conversation.customerPhone);
    if (!phone) {
      continue;
    }

    const name = normalizeText(conversation.customerName) || phone;
    const existing = uniqueByPhone.get(phone);

    if (!existing || (!existing.name && name)) {
      uniqueByPhone.set(phone, { phone, name });
    }
  }

  await Promise.all(
    Array.from(uniqueByPhone.values()).map((entry) =>
      upsertWhatsAppContact({
        organizationId,
        phone: entry.phone,
        name: entry.name,
      })
    )
  );
};

module.exports = {
  normalizePhone,
  upsertWhatsAppContact,
  syncContactsFromConversations,
};

export {};
