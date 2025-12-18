import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

function adminEmailsList() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const target = email.toLowerCase();
  return adminEmailsList()
    .map((s) => s.toLowerCase())
    .includes(target);
}

export default async function AdminEntry() {
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    if (isAdminEmail(session.user.email)) {
      redirect("/admin/dashboard");
    }
    redirect("/dashboard");
  }

  const allowed = adminEmailsList();
  const allowedText =
    allowed.length > 0
      ? allowed.join(", ")
      : "No admin emails configured";

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-slate-300 mt-2">Sign in with Google to access the dashboard.</p>

        <div className="mt-6">
          <Link
            href="/api/auth/signin/google?callbackUrl=/admin/dashboard"
            className="inline-flex w-full items-center justify-center rounded-xl bg-white text-slate-950 px-4 py-3 font-semibold"
          >
            Sign in with Google
          </Link>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Only allowed: {allowedText}
        </p>
      </div>
    </main>
  );
}
