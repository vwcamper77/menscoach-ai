// app/admin/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import { getFirestore } from "@/lib/firebaseAdmin";

type Row = {
  email: string;
  name?: string;

  createdAt?: string;
  updatedAt?: string;

  plan?: string;

  preferredMode?: string;
  primaryFocus?: string;
  goal30?: string;

  onboardingComplete?: boolean;
  onboardingSkipped?: boolean;

  chatsTotal?: number;
  lastChatAt?: string;
};

function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allow = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

function fmtDate(value: any): string | undefined {
  if (!value) return undefined;

  // Firestore Timestamp support
  const dateValue =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(dateValue.getTime())) return undefined;

  // Short format: YYYY-MM-DD HH:mm (UTC)
  return dateValue.toISOString().replace("T", " ").slice(0, 16);
}

function cleanString(v: any): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

async function getAdminDashboardRows(): Promise<Row[]> {
  const db = getFirestore();

  // 1) Users
  const usersSnap = await db
    .collection("mc_users")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

  // 2) Sessions (recent) for chat stats
  // For scale, store counters on mc_users instead of scanning sessions
  const sessionsSnap = await db
    .collection("mc_sessions")
    .orderBy("updatedAt", "desc")
    .limit(800)
    .get();

  const sessions = sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

  // Index sessions by email
  const sessionsByEmail = new Map<string, any[]>();
  for (const s of sessions) {
    const email = (s.email ?? s.userEmail ?? "").toString().toLowerCase();
    if (!email) continue;
    const arr = sessionsByEmail.get(email) ?? [];
    arr.push(s);
    sessionsByEmail.set(email, arr);
  }

  const getChatStatsForEmail = (email: string) => {
    const list = sessionsByEmail.get(email.toLowerCase()) ?? [];
    let chatsTotal = 0;
    let lastChatAt: string | undefined;

    for (const s of list) {
      const history = Array.isArray(s.history) ? s.history : [];
      chatsTotal += history.length;

      const updated = fmtDate(s.updatedAt) ?? fmtDate(s.lastMessageAt);
      if (updated) {
        if (!lastChatAt || updated > lastChatAt) lastChatAt = updated;
      }
    }

    return { chatsTotal, lastChatAt };
  };

  // 3) Build rows
  const rows: Row[] = users.map((u) => {
    const email = String(u.email ?? "").toLowerCase();
    const { chatsTotal, lastChatAt } = getChatStatsForEmail(email);

    return {
      email,
      name: cleanString(u.name),

      createdAt: fmtDate(u.createdAt),
      updatedAt: fmtDate(u.updatedAt),

      plan: cleanString(u.plan) ?? "free",

      preferredMode: cleanString(u.preferredMode),
      primaryFocus: cleanString(u.primaryFocus),
      goal30: cleanString(u.goal30),

      onboardingComplete: typeof u.onboardingComplete === "boolean" ? u.onboardingComplete : undefined,
      onboardingSkipped: typeof u.onboardingSkipped === "boolean" ? u.onboardingSkipped : undefined,

      chatsTotal,
      lastChatAt,
    };
  });

  return rows;
}

export const runtime = "nodejs";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/admin/dashboard");
  }

  if (!isAdminEmail(email)) {
    redirect("/dashboard");
  }

  const rows = await getAdminDashboardRows();

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="text-slate-300 mt-1">
              Users, onboarding picks, plan, chat activity.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Access: {email}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900">
              <tr className="text-left">
                <th className="p-3">Email</th>
                <th className="p-3">Name</th>
                <th className="p-3">Created</th>
                <th className="p-3">Updated</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Focus</th>
                <th className="p-3">Goal (30)</th>
                <th className="p-3">Onboarded</th>
                <th className="p-3">Skipped</th>
                <th className="p-3">Chat turns</th>
                <th className="p-3">Last chat</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.email} className="border-t border-slate-800 align-top">
                  <td className="p-3 font-medium whitespace-nowrap">{r.email}</td>
                  <td className="p-3 whitespace-nowrap">{r.name ?? "-"}</td>

                  <td className="p-3 whitespace-nowrap">{r.createdAt ?? "-"}</td>
                  <td className="p-3 whitespace-nowrap">{r.updatedAt ?? "-"}</td>

                  <td className="p-3 whitespace-nowrap">{r.plan ?? "free"}</td>

                  <td className="p-3 whitespace-nowrap">{r.preferredMode ?? "-"}</td>
                  <td className="p-3 whitespace-nowrap">{r.primaryFocus ?? "-"}</td>

                  <td className="p-3 min-w-60 text-slate-200">
                    {r.goal30 ?? "-"}
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    {typeof r.onboardingComplete === "boolean"
                      ? r.onboardingComplete
                        ? "Yes"
                        : "No"
                      : "-"}
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    {typeof r.onboardingSkipped === "boolean"
                      ? r.onboardingSkipped
                        ? "Yes"
                        : "No"
                      : "-"}
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    {typeof r.chatsTotal === "number" ? r.chatsTotal : "-"}
                  </td>

                  <td className="p-3 whitespace-nowrap">{r.lastChatAt ?? "-"}</td>
                </tr>
              ))}

              {!rows.length && (
                <tr>
                  <td className="p-3" colSpan={12}>
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-slate-400">
          Tip: for scale, store per-user counters (totalMessages, lastChatAt) on mc_users
          instead of scanning mc_sessions.
        </div>
      </div>
    </main>
  );
}
