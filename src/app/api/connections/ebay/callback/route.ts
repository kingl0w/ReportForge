import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens, EBAY_SCOPES, getApiBaseUrl } from "@/lib/ebay/oauth";
import { ebayCallbackSchema } from "@/lib/ebay/validation";
import { encrypt } from "@/lib/crypto";
import type { EbayOAuthState } from "@/lib/ebay/types";
import { logActivity } from "@/lib/logging/activity";

const STATE_COOKIE = "ebay_oauth_state";
const DEFAULT_MARKETPLACE = "EBAY_US";

/*GET /api/connections/ebay/callback
 * eBay OAuth callback — exchanges code for tokens, stores encrypted connection.*/
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const queryObj: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const parsed = ebayCallbackSchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/connections?error=invalid_callback`
      );
    }

    const { code, state } = parsed.data;

    const cookieStore = await cookies();
    const stateCookie = cookieStore.get(STATE_COOKIE);
    if (!stateCookie?.value) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/connections?error=missing_state`
      );
    }

    let storedState: EbayOAuthState;
    try {
      storedState = JSON.parse(stateCookie.value) as EbayOAuthState;
    } catch {
      return NextResponse.redirect(
        `${appUrl}/dashboard/connections?error=invalid_state`
      );
    }

    if (storedState.state !== state) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/connections?error=state_mismatch`
      );
    }

    const tokenResponse = await exchangeCodeForTokens(code);

    const now = Date.now();
    const encryptedCredentials = {
      accessToken: encrypt(tokenResponse.access_token),
      refreshToken: encrypt(tokenResponse.refresh_token),
      accessTokenExpiry: new Date(
        now + tokenResponse.expires_in * 1000
      ).toISOString(),
      refreshTokenExpiry: new Date(
        now + tokenResponse.refresh_token_expires_in * 1000
      ).toISOString(),
    };

    const admin = createAdminClient();

    //fetch eBay username for display via identity call; falls back to default
    let username = "eBay Seller";
    try {
      const identityRes = await fetch(
        `${getApiBaseUrl()}/commerce/identity/v1/user/`,
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (identityRes.ok) {
        const identity = (await identityRes.json()) as { username?: string };
        if (identity.username) username = identity.username;
      }
    } catch {
      //non-critical — continue with fallback username
    }

    //upsert: if the user already has an active eBay connection, update it
    const { data: existing } = await admin
      .from("DataConnection")
      .select("id")
      .eq("userId", storedState.userId)
      .eq("provider", "EBAY")
      .single();

    const config = {
      marketplace: DEFAULT_MARKETPLACE,
      username,
      scopes: EBAY_SCOPES,
    };

    if (existing) {
      await admin
        .from("DataConnection")
        .update({
          credentials: encryptedCredentials,
          config,
          shopDomain: username,
          isActive: true,
        })
        .eq("id", existing.id);
    } else {
      const { error: insertError } = await admin
        .from("DataConnection")
        .insert({
          id: crypto.randomUUID(),
          userId: storedState.userId,
          provider: "EBAY",
          credentials: encryptedCredentials,
          config,
          shopDomain: username,
          isActive: true,
        });

      if (insertError) {
        return NextResponse.redirect(
          `${appUrl}/dashboard/connections?error=db_error`
        );
      }
    }

    cookieStore.delete(STATE_COOKIE);

    logActivity({
      action: "connection.create",
      userId: storedState.userId,
      metadata: { provider: "EBAY", username },
    });

    return NextResponse.redirect(
      `${appUrl}/dashboard/connections?connected=ebay`
    );
  } catch (error: unknown) {
    console.error("eBay OAuth callback error:", error);
    return NextResponse.redirect(
      `${appUrl}/dashboard/connections?error=callback_failed`
    );
  }
}
