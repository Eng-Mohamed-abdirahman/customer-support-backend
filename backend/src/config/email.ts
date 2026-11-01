import nodemailer from "nodemailer";

import { env } from "./env";

type MailClient = {
  transporter: nodemailer.Transporter;
  fromAddress: string;
};

let cachedMailClient: MailClient | null = null;

const isUnsetOrPlaceholder = (value?: string) => {
  const normalized = (value ?? "").trim().toLowerCase();

  return (
    normalized.length === 0 ||
    normalized === "your-email@ethereal.email" ||
    normalized === "your-password"
  );
};

const createConfiguredSmtpClient = (): MailClient => {
  const transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.secure,
    auth: {
      user: env.email.auth.user,
      pass: env.email.auth.pass,
    },
  });

  return {
    transporter,
    fromAddress: `"Supportly" <${env.email.auth.user}>`,
  };
};

export const getMailClient = async (): Promise<MailClient> => {
  if (cachedMailClient) {
    return cachedMailClient;
  }

  const hasConfiguredSmtp =
    !isUnsetOrPlaceholder(env.email.auth.user) &&
    !isUnsetOrPlaceholder(env.email.auth.pass);

  if (hasConfiguredSmtp) {
    cachedMailClient = createConfiguredSmtpClient();
    return cachedMailClient;
  }

  throw new Error(
    "SMTP is not configured. Set EMAIL_USER and EMAIL_PASS with valid credentials."
  );
};
