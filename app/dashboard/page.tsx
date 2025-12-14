import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../auth";
import DashboardClient from "./DashboardClient";

function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allow = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!isAdminEmail(email)) {
    redirect("/admin");
  }

  return <DashboardClient />;
}
