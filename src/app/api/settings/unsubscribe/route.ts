import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_PREFERENCES = new Set([
  "emailOnReportComplete",
  "emailWeeklyDigest",
  "emailMarketingUpdates",
]);

/**
 *GET /api/settings/unsubscribe?token=<base64url>
 *
 *HMAC-signed, time-limited email unsubscribe.
 *token contains { userId, preference, exp, sig }.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Missing unsubscribe token", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(token, "base64url").toString("utf-8")
    ) as { userId?: string; preference?: string; exp?: number; sig?: string };

    if (
      !decoded.userId ||
      !decoded.preference ||
      !decoded.exp ||
      !decoded.sig ||
      !VALID_PREFERENCES.has(decoded.preference)
    ) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    //verify expiry
    if (Date.now() > decoded.exp) {
      return NextResponse.json(
        { error: "Unsubscribe link has expired", code: "TOKEN_EXPIRED" },
        { status: 400 }
      );
    }

    //verify HMAC signature
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) {
      return NextResponse.json(
        { error: "Server configuration error", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    const payload = `${decoded.userId}:${decoded.preference}:${decoded.exp}`;
    const expectedSig = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const sigBuffer = Buffer.from(decoded.sig, "hex");
    const expectedBuffer = Buffer.from(expectedSig, "hex");

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return NextResponse.json(
        { error: "Invalid unsubscribe token", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    //ensure settings row exists
    const { data: existing } = await admin
      .from("UserSettings")
      .select("id")
      .eq("userId", decoded.userId)
      .single();

    if (existing) {
      await admin
        .from("UserSettings")
        .update({ [decoded.preference]: false })
        .eq("userId", decoded.userId);
    } else {
      await admin
        .from("UserSettings")
        .insert({
          userId: decoded.userId,
          [decoded.preference]: false,
        });
    }

    //redirect to app with confirmation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?unsubscribed=${decoded.preference}`
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid unsubscribe token", code: "INVALID_TOKEN" },
      { status: 400 }
    );
  }
}
