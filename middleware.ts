import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host");

  // Never redirect or modify the Stripe webhook route
  if (pathname === "/api/stripe/webhook") {
    return NextResponse.next();
  }

  // Skip all API routes to avoid interfering with webhooks or other API calls
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Example www redirect for non-API traffic
  if (host === "menscoach.ai") {
    const url = req.nextUrl.clone();
    url.host = "www.menscoach.ai";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
