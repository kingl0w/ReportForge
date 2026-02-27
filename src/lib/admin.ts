import { NextRequest, NextResponse } from "next/server";

/**
 * Validates the ADMIN_SECRET header on admin API routes.
 * Returns null if authorized, or a 401/403 NextResponse if not.
 */
export function requireAdminSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Admin API not configured", code: "ADMIN_NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  const provided = request.headers.get("x-admin-secret");
  if (!provided || provided !== secret) {
    return NextResponse.json(
      { error: "Unauthorized", code: "ADMIN_UNAUTHORIZED" },
      { status: 401 }
    );
  }

  return null;
}
