import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyHmac, exchangeCodeForToken, SHOPIFY_SCOPES } from "@/lib/shopify/oauth";
import { shopifyCallbackSchema } from "@/lib/shopify/validation";
import { encrypt } from "@/lib/crypto";
import type { ShopifyOAuthState } from "@/lib/shopify/types";
import { logActivity } from "@/lib/logging/activity";

const STATE_COOKIE = "shopify_oauth_state";
const API_VERSION = "2024-10";

/*GET /api/connections/shopify/callback
 * Shopify OAuth callback — exchanges code for token, stores encrypted connection.*/
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const queryObj: Record<string, string> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const parsed = shopifyCallbackSchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/connections?error=invalid_callback`
      );
    }

    const { code, shop, state } = parsed.data;

    if (!verifyHmac(queryObj)) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/connections?error=hmac_verification_failed`
      );
    }

    const cookieStore = await cookies();
    const stateCookie = cookieStore.get(STATE_COOKIE);
    if (!stateCookie?.value) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/connections?error=missing_state`
      );
    }

    let storedState: ShopifyOAuthState;
    try {
      storedState = JSON.parse(stateCookie.value) as ShopifyOAuthState;
    } catch {
      return NextResponse.redirect(
        `${appUrl}/dashboard/connections?error=invalid_state`
      );
    }

    if (storedState.state !== state || storedState.shop !== shop) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/connections?error=state_mismatch`
      );
    }

    const accessToken = await exchangeCodeForToken(shop, code);

    const encryptedToken = encrypt(accessToken);
    const admin = createAdminClient();

    //upsert: if the user already has an active connection for this shop, update it
    const { data: existing } = await admin
      .from("DataConnection")
      .select("id")
      .eq("userId", storedState.userId)
      .eq("provider", "SHOPIFY")
      .eq("shopDomain", shop)
      .single();

    if (existing) {
      await admin
        .from("DataConnection")
        .update({
          credentials: { accessToken: encryptedToken },
          config: { shop, scopes: SHOPIFY_SCOPES, apiVersion: API_VERSION },
          isActive: true,
        })
        .eq("id", existing.id);
    } else {
      const { error: insertError } = await admin
        .from("DataConnection")
        .insert({
          id: crypto.randomUUID(),
          userId: storedState.userId,
          provider: "SHOPIFY",
          credentials: { accessToken: encryptedToken },
          config: { shop, scopes: SHOPIFY_SCOPES, apiVersion: API_VERSION },
          shopDomain: shop,
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
      metadata: { provider: "SHOPIFY", shop },
    });

    return NextResponse.redirect(
      `${appUrl}/dashboard/connections?connected=shopify`
    );
  } catch (error: unknown) {
    console.error("Shopify OAuth callback error:", error);
    return NextResponse.redirect(
      `${appUrl}/dashboard/connections?error=callback_failed`
    );
  }
}
