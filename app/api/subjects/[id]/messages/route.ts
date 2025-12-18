import { NextRequest, NextResponse } from "next/server";
import { listMessages } from "@/lib/subjects";
import { getEntitlements, EntitlementError, Plan, Entitlements } from "@/lib/entitlements";
import { getUserPlan } from "@/lib/users";
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: subjectId } = await params;
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
    const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : 500;
    return errorResponse(code, message, status, plan, ent);
  }
}
