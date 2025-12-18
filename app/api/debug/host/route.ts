import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host");
  const xForwardedHost = req.headers.get("x-forwarded-host");
  const xForwardedProto = req.headers.get("x-forwarded-proto");

  return NextResponse.json(
    {
      host,
      xForwardedHost,
      xForwardedProto,
    },
    { status: 200 }
  );
}
