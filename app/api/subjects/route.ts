import { NextResponse } from "next/server";
import { createSubject, listSubjects } from "@/lib/subjects";
import {
  EntitlementError,
  getEntitlements,
  Plan,
  Entitlements,
} from "@/lib/entitlements";
import { getUserPlan } from "@/lib/users";
import { Mode } from "@/lib/modes";

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

export async function GET(req: Request) {
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
        plan
      );
    }

    const subjects = await listSubjects(sessionId);
    return NextResponse.json({ subjects, plan, entitlements: ent });
  } catch (err: any) {
    if (err instanceof EntitlementError) {
      return errorResponse(err.code, err.message, 403, plan, ent);
    }

    const code = err?.code ?? "UNKNOWN";
    const message = err?.message ?? "Unexpected error";
    return errorResponse(code, message, 500, plan, ent);
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const titleRaw = (body?.title as string | undefined)?.trim();
    const mode = body?.mode as Mode | undefined;

    if (!titleRaw || titleRaw.length < 2) {
      return errorResponse("INVALID_TITLE", "Title is required.", 400, plan, ent);
    }

    const allowedModes: Mode[] = [
      "grounding",
      "discipline",
      "relationships",
      "business",
      "purpose",
    ];
    if (!mode || !allowedModes.includes(mode)) {
      return errorResponse("INVALID_MODE", "Mode is required.", 400, plan, ent);
    }

    const subject = await createSubject(
      sessionId,
      { title: titleRaw.slice(0, 80), mode },
      plan
    );

    return NextResponse.json({ subject, plan, entitlements: ent }, { status: 201 });
  } catch (err: any) {
    if (err instanceof EntitlementError) {
      const status = err.code === "LIMIT_REACHED" ? 429 : 403;
      return errorResponse(err.code, err.message, status, plan, ent);
    }

    const code = err?.code ?? "UNKNOWN";
    const message = err?.message ?? "Unexpected error";
    return errorResponse(code, message, 500, plan, ent);
  }
}
