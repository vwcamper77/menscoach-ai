import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import DashboardClient from "./DashboardClient";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login?callbackUrl=/dashboard");

  return <DashboardClient />;
}
