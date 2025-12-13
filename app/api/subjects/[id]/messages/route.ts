import { NextResponse } from "next/server";
import { listMessages } from "@/lib/subjects";
import { getEntitlements, EntitlementError, Plan, Entitlements } from "@/lib/entitlements";
import { getUserPlan } from "@/lib/users";

const SESSION_COOKIE_NAME = "mc_session_id";

function cleanSessionId(value?: string | null) {
  return value ? value.replaceAll("/", "_") : null;
}

function readSessionFromCookie(req: Request): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  const cookies = raw.split(";").map((c) => c.trim());
  const target = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!target) return null;
  const value = target.slice(SESSION_COOKIE_NAME.length + 1);
  try {
    return cleanSessionId(decodeURIComponent(value));
  } catch {
    return cleanSessionId(value);
  }
}

function resolveSessionId(req: Request): string | null {
  const cookieId = readSessionFromCookie(req);
  if (cookieId) return cookieId;
  const headerId = cleanSessionId(req.headers.get("x-session-id"));
  if (headerId) return headerId;
  return null;
}

function errorResponse(
  code: string,
  message: string,
  status = 400,
  plan?: Plan,
  entitlements?: Entitlements
) {
  return NextResponse.json({ error: { code, message }, plan, entitlements }, { status });
}

export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  let plan: Plan | undefined;
  let ent: Entitlements | undefined;
  try {
    const sessionId = resolveSessionId(req);
    if (!sessionId) {
      return errorResponse("SESSION_REQUIRED", "Session is required.", 401);
    }

    plan = await getUserPlan(sessionId);
    ent = getEntitlements(plan);

    if ((ent.maxSubjects ?? 0) <= 0) {
      return errorResponse(
        "UPGRADE_REQUIRED",
        "Subjects are available on Pro plans.",
        403,
        plan,
        ent
      );
    }

    const subjectId = context.params?.id;
    if (!subjectId) {
      return errorResponse("INVALID_SUBJECT", "Subject id is required.", 400, plan);
    }

    const messages = await listMessages(sessionId, subjectId, 50);
    return NextResponse.json({ messages, plan, entitlements: ent });
  } catch (err: any) {
    if (err instanceof EntitlementError) {
      return errorResponse(err.code, err.message, 403, plan, ent);
    }

    const code = err?.code ?? "UNKNOWN";
    const message = err?.message ?? "Unexpected error";
    const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 404 : 500;
    return errorResponse(code, message, status, plan, ent);
  }
}
