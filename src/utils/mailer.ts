import * as nodemailer from "nodemailer";

type MailEnv = {
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  MAIL_FROM?: string;
  MAIL_TO?: string;
  MAIL_CC?: string;
  ALERT_EMAIL_ENABLED?: string;
};

function getEnv(): MailEnv {
  return {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    MAIL_FROM: process.env.MAIL_FROM,
    MAIL_TO: process.env.MAIL_TO,
    MAIL_CC: process.env.MAIL_CC,
    ALERT_EMAIL_ENABLED: process.env.ALERT_EMAIL_ENABLED,
  };
}

function parseBool(s: string | undefined, def = true): boolean {
  if (s == null) return def;
  const v = s.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  return def;
}

function parseList(s?: string): string[] {
  return (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

let transporter: nodemailer.Transporter | null = null;

export function isEmailEnabled(): boolean {
  const env = getEnv();
  return parseBool(env.ALERT_EMAIL_ENABLED, true);
}

export function isMailerConfigured(): boolean {
  const env = getEnv();
  const hasSmtp =
    !!env.SMTP_HOST &&
    (env.SMTP_PORT ?? "").length > 0 &&
    !!env.SMTP_USER &&
    !!env.SMTP_PASS;

  const hasFrom = !!(env.MAIL_FROM || env.SMTP_USER);
  const hasRecipients = !!(env.MAIL_TO && env.MAIL_TO.trim());

  return hasSmtp && hasFrom && hasRecipients;
}

export function isMailerReady(): boolean {
  return isEmailEnabled() && isMailerConfigured();
}

function ensureTransport(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (!isMailerConfigured()) {
    throw new Error("SMTP/MAIL not configured");
  }

  const env = getEnv();
  const port = Number(env.SMTP_PORT || "587");
  const secure =
    (env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST!,
    port,
    secure,
    auth: {
      user: env.SMTP_USER!,
      pass: env.SMTP_PASS!,
    },
  });

  return transporter;
}

function parseTo(): string[] {
  const env = getEnv();
  const raw = (env.MAIL_TO || "").trim();
  return parseList(raw);
}
function parseCc(): string[] {
  const env = getEnv();
  return parseList(env.MAIL_CC);
}

export async function sendToAlertList(
  subject: string,
  text: string,
  html?: string,
  opts?: { cc?: string[] }
): Promise<{ accepted: string[]; rejected: string[] }> {
  if (!isEmailEnabled()) {
    throw new Error("Email disabled by ALERT_EMAIL_ENABLED");
  }

  const toList = parseTo();
  if (toList.length === 0) {
    throw new Error("MAIL_TO/ALERT_EMAILS is empty");
  }

  const env = getEnv();
  const from = env.MAIL_FROM || env.SMTP_USER!;
  const ccList = opts?.cc ?? parseCc();

  const info = await ensureTransport().sendMail({
    from,
    to: toList.join(", "),
    cc: ccList.length ? ccList.join(", ") : undefined,
    subject,
    text,
    ...(html ? { html } : {}),
  });

  const accepted = Array.isArray(info.accepted)
    ? info.accepted.map(String)
    : [];
  const rejected = Array.isArray(info.rejected)
    ? info.rejected.map(String)
    : [];
  return { accepted, rejected };
}
