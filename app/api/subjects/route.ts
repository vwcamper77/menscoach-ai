import { NextRequest, NextResponse } from "next/server";
import { createSubject, listSubjects } from "@/lib/subjects";
import { getEntitlements, EntitlementError, Plan, Entitlements } from "@/lib/entitlements";
import { getUserPlan } from "@/lib/users";
import type { Mode } from "@/lib/modes";
import { resolveSessionId } from "@/lib/sessionId";

function errorResponse(
  code: string,
  message: string,
  status = 400,
  plan?: Plan,
  entitlements?: Entitlements
) {
  return NextResponse.json({ error: { code, message }, plan, entitlements }, { status });
}

// GET /api/subjects -> list subjects
export async function GET(req: NextRequest) {
  let plan: Plan | undefined;
  let ent: Entitlements | undefined;

  try {
    const sessionResolution = resolveSessionId(req, { allowHeader: true });
    if (!sessionResolution) {
      return errorResponse("SESSION_REQUIRED", "Session is required.", 401);
    }

    const sessionId = sessionResolution.sessionId;

    plan = await getUserPlan(sessionId);
    ent = getEntitlements(plan);

    if ((ent.maxSubjects ?? 0) <= 0) {
      return errorResponse(
        "UPGRADE_REQUIRED",
        "Subjects are available on paid plans.",
        403,
        plan,
        ent
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
    const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : 500;
    return errorResponse(code, message, status, plan, ent);
  }
}

// POST /api/subjects -> create a subject
export async function POST(req: NextRequest) {
  let plan: Plan | undefined;
  let ent: Entitlements | undefined;

  try {
    const sessionResolution = resolveSessionId(req, { allowHeader: true });
    if (!sessionResolution) {
      return errorResponse("SESSION_REQUIRED", "Session is required.", 401);
    }

    const sessionId = sessionResolution.sessionId;

    plan = await getUserPlan(sessionId);
    ent = getEntitlements(plan);

    if ((ent.maxSubjects ?? 0) <= 0) {
      return errorResponse(
        "UPGRADE_REQUIRED",
        "Subjects are available on paid plans.",
        403,
        plan,
        ent
      );
    }

    const body = await req.json().catch(() => ({}));

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!title) {
      return errorResponse("INVALID_TITLE", "Title is required.", 400, plan, ent);
    }

    // --- FIX: coerce string -> Mode ---
    const modeRaw = body?.mode;
    if (typeof modeRaw !== "string" || !modeRaw.trim()) {
      return errorResponse("INVALID_MODE", "Mode is required.", 400, plan, ent);
    }

    // Cast to Mode (compile-time). If you want strict runtime validation,
    // export an isMode() guard from lib/modes.ts and use it here instead.
    const mode = modeRaw as Mode;

    const subject = await createSubject(sessionId, { title, mode }, plan);
    return NextResponse.json({ subject, plan, entitlements: ent });
  } catch (err: any) {
    if (err instanceof EntitlementError) {
      return errorResponse(err.code, err.message, 403, plan, ent);
    }

    const code = err?.code ?? "UNKNOWN";
    const message = err?.message ?? "Unexpected error";
    const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : 500;
    return errorResponse(code, message, status, plan, ent);
  }
}
