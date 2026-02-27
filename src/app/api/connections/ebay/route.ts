import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAuthUrl, generateNonce } from "@/lib/ebay/oauth";
import { ebayDisconnectSchema } from "@/lib/ebay/validation";

const STATE_COOKIE = "ebay_oauth_state";
const STATE_TTL_SECONDS = 600; //10 minutes

/*POST /api/connections/ebay
 * initiate eBay OAuth flow. returns the auth URL for client redirect.*/
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    //eBay doesn't require a shop domain input — just redirect to auth
    //consume the body to avoid "body already read" errors in some runtimes
    await request.json().catch(() => ({}));

    const state = generateNonce();
    const authUrl = buildAuthUrl(state);

    //store OAuth state in an httpOnly cookie for CSRF protection
    const cookieStore = await cookies();
    cookieStore.set(
      STATE_COOKIE,
      JSON.stringify({ state, userId: user.id }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: STATE_TTL_SECONDS,
        path: "/",
      }
    );

    return NextResponse.json({ authUrl });
  } catch (error: unknown) {
    console.error("[ebay] OAuth initiation error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to initiate eBay connection. Please try again.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/*DELETE /api/connections/ebay
 * soft-delete an eBay connection (set isActive = false).*/
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = ebayDisconnectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          code: "INVALID_INPUT",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("DataConnection")
      .update({ isActive: false })
      .eq("id", parsed.data.connectionId)
      .eq("userId", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to disconnect", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
