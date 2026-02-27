import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const MUTATING_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

/** Paths that generate too much noise for request logging. */
const LOG_SKIP_PREFIXES = ["/api/health", "/_next/", "/favicon.ico"];

function shouldLogRequest(pathname: string): boolean {
  return !LOG_SKIP_PREFIXES.some((p) => pathname.startsWith(p));
}

function emitRequestLog(
  request: NextRequest,
  status: number,
  durationMs: number
): void {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? null;

  const log = {
    level: "info",
    timestamp: new Date().toISOString(),
    method: request.method,
    path: request.nextUrl.pathname,
    status,
    durationMs,
    ip,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };

  console.log(JSON.stringify(log));
}

/**API routes that handle their own auth (webhooks, OAuth callbacks, cron jobs, public unsubscribe, signup check)*/
const API_AUTH_EXEMPT = new Set([
  "/api/health",
  "/api/webhooks/stripe",
  "/api/connections/shopify/callback",
  "/api/connections/ebay/callback",
  "/api/settings/unsubscribe",
  "/api/auth/signup-check",
]);

/**prefixes where API routes handle their own auth*/
const API_AUTH_EXEMPT_PREFIXES = ["/api/cron/", "/api/admin/"];

function isApiAuthExempt(pathname: string): boolean {
  if (API_AUTH_EXEMPT.has(pathname)) return true;
  return API_AUTH_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const startTime = Date.now();
  const doLog = shouldLogRequest(pathname);

  //CSRF protection for mutating requests
  if (MUTATING_METHODS.has(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    //exempt routes that use their own verification (webhooks, OAuth callbacks, cron jobs)
    const isCsrfExempt =
      pathname === "/api/webhooks/stripe" ||
      pathname === "/api/connections/shopify/callback" ||
      pathname === "/api/connections/ebay/callback" ||
      pathname.startsWith("/api/cron/");

    if (!isCsrfExempt) {
      //fail-closed: reject if Origin header is missing on mutating requests
      if (!origin) {
        if (doLog) emitRequestLog(request, 403, Date.now() - startTime);
        return NextResponse.json(
          { error: "Forbidden — missing Origin header", code: "CSRF_BLOCKED" },
          { status: 403 }
        );
      }

      if (host) {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          if (doLog) emitRequestLog(request, 403, Date.now() - startTime);
          return NextResponse.json(
            { error: "Forbidden", code: "ORIGIN_MISMATCH" },
            { status: 403 }
          );
        }
      }
    }
  }

  const response = await updateSession(request);

  //defense-in-depth: catches any API route that forgets its own auth check
  if (pathname.startsWith("/api/") && !isApiAuthExempt(pathname)) {
    //lightweight gate — updateSession already called getUser() and set cookies
    const hasAuthCookies = request.cookies.getAll().some(
      (c) => c.name.includes("auth-token") || c.name.includes("sb-")
    );

    if (!hasAuthCookies) {
      if (doLog) emitRequestLog(request, 401, Date.now() - startTime);
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
  }

  if (doLog) emitRequestLog(request, response.status, Date.now() - startTime);
  return response;
}

export const config = {
  matcher: [
    /*match all request paths except _next/static, _next/image, favicon.ico, and public assets*/
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
