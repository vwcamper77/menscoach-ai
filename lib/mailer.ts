import nodemailer from "nodemailer";

let cached: ReturnType<typeof nodemailer.createTransport> | null = null;

export function getMailer() {
  if (cached) return cached;

  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  if (!SMTP_USER || !SMTP_PASS) {
    // Do NOT throw at import time. Only throw when someone tries to send.
    throw new Error("Missing SMTP_USER or SMTP_PASS environment variables");
  }

  cached = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return cached;
}
