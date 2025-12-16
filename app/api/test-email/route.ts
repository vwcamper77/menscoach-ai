import { NextResponse } from "next/server";
import { getMailer } from "@/lib/mailer";

export async function GET() {
  const mailer = getMailer();

  await mailer.sendMail({
    from: process.env.EMAIL_FROM!,
    to: process.env.SMTP_USER!,
    subject: "MensCoach SMTP test",
    html: "<p>If you received this, SMTP is working.</p>",
  });

  return NextResponse.json({ success: true });
}
