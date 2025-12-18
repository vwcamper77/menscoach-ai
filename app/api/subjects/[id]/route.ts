import { NextRequest, NextResponse } from "next/server";
import { getEntitlements, EntitlementError, Plan, Entitlements } from "@/lib/entitlements";
import { getUserPlan } from "@/lib/users";
import { resolveSessionId } from "@/lib/sessionId";
import { updateSubject, deleteSubject, getSubject } from "@/lib/subjects";

function errorResponse(
  code: string,
  message: string,
  status = 400,
  plan?: Plan,
  entitlements?: Entitlements
) {
  return NextResponse.json({ error: { code, message }, plan, entitlements }, { status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
        "Chats are available on paid plans.",
        403,
        plan,
        ent
      );
    }

    const { id } = params;
    if (!id) {
      return errorResponse("INVALID_SUBJECT", "Chat id is required.", 400, plan, ent);
    }

    const body = await req.json().catch(() => ({}));
    const title =
      typeof body?.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : undefined;
    const mode =
      typeof body?.mode === "string" && body.mode.trim().length > 0
        ? body.mode.trim()
        : undefined;

    if (!title && !mode) {
      return errorResponse("NO_UPDATES", "Nothing to update.", 400, plan, ent);
    }

    const subject = await updateSubject(sessionId, id, { title, mode });

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
        "Chats are available on paid plans.",
        403,
        plan,
        ent
      );
    }

    const { id } = params;
    if (!id) {
      return errorResponse("INVALID_SUBJECT", "Chat id is required.", 400, plan, ent);
    }

    await getSubject(sessionId, id); // ownership check
    await deleteSubject(sessionId, id);

    return NextResponse.json({ ok: true, plan, entitlements: ent });
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
