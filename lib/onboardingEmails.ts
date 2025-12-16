export function welcomeEmail(opts: { name?: string | null; email: string }) {
  const first = (opts.name || "").trim().split(" ")[0] || "there";
  const subject = "Welcome to MensCoach AI";

  const text = [
    `Hi ${first},`,
    "",
    "Welcome to MensCoach AI.",
    "You can log in anytime at:",
    "https://menscoach.ai",
    "",
    "If you ever need help, just reply to this email.",
    "",
    "MensCoach AI Support",
  ].join("\n");

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Welcome, ${first}</h2>
    <p>Your MensCoach AI account is ready.</p>
    <p><a href="https://menscoach.ai">Open menscoach.ai</a></p>
    <p style="margin-top: 18px;">If you need help, just reply to this email.</p>
    <p style="color:#666;font-size:12px;margin-top:24px;">
      If you did not sign up, you can ignore this email.
    </p>
  </div>`;
  return { subject, text, html };
}

export function adminSignupEmail(opts: {
  email: string;
  name?: string | null;
  provider?: string | null;
}) {
  const subject = `New signup: ${opts.email}`;

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h3>New MensCoach AI signup</h3>
    <p><strong>Email:</strong> ${opts.email}</p>
    <p><strong>Name:</strong> ${opts.name ?? "-"}</p>
    <p><strong>Provider:</strong> ${opts.provider ?? "-"}</p>
    <p><strong>Time (UTC):</strong> ${new Date().toISOString()}</p>
  </div>`;
  const text = `New signup\nEmail: ${opts.email}\nName: ${opts.name ?? "-"}\nProvider: ${
    opts.provider ?? "-"
  }\nTime (UTC): ${new Date().toISOString()}`;

  return { subject, text, html };
}
