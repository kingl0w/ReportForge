import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*POST /api/billing/portal
 *
 * creates a Stripe Customer Portal session for managing subscription,
 * updating payment methods, and canceling. redirects back to /dashboard/settings.*/
export async function POST() {
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

    const admin = createAdminClient();
    const { data: userData } = await admin
      .from("User")
      .select("stripeCustomerId")
      .eq("id", user.id)
      .single();

    if (!userData?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found", code: "NO_CUSTOMER" },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: `${appUrl}/dashboard/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create portal session";
    console.error("[billing-portal] Error:", message);
    return NextResponse.json(
      { error: message, code: "PORTAL_ERROR" },
      { status: 500 }
    );
  }
}
