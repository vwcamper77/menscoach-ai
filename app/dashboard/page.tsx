import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../auth";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  // Require login, but allow all signed-in users (not just admins)
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/dashboard");
  }
  return <DashboardClient />;
}
