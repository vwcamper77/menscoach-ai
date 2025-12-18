import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never redirect or modify the Stripe webhook route
  if (pathname === "/api/stripe/webhook") {
    return NextResponse.next();
  }

  // Skip all API routes to avoid interfering with webhooks or other API calls
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
