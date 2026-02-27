import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { stripe } from "@/lib/stripe/client";
import { PLANS } from "@/lib/stripe/plans";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRateLimiter } from "@/lib/rate-limit";
import { logActivity, getClientIp } from "@/lib/logging/activity";

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  message: "Too many checkout requests. Please wait a minute.",
  prefix: "rl:checkout",
});

const checkoutSchema = z.object({
  planId: z.enum(["PRO", "PER_REPORT"]),
});

/*POST /api/checkout
 *
 * creates a Stripe Checkout session for PRO subscription or one-time report purchase.
 * - PRO: mode 'subscription' with optional trial period for first-time subscribers
 * - PER-Report: mode 'payment' with report metadata*/
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

    const rl = await limiter.checkAsync(user.id);
    if (!rl.allowed) {
      logActivity({
        action: "ratelimit.hit",
        userId: user.id,
        ip: getClientIp(request),
        metadata: { route: "/api/checkout" },
      });
      return NextResponse.json(
        { error: rl.message, code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid plan", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    const plan = PLANS[parsed.data.planId];
    if (!plan.priceId) {
      return NextResponse.json(
        { error: "Invalid plan for checkout", code: "INVALID_PLAN" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: userData } = await admin
      .from("User")
      .select("stripeCustomerId, email")
      .eq("id", user.id)
      .single();

    let customerId = userData?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData?.email ?? user.email ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await admin
        .from("User")
        .update({ stripeCustomerId: customerId })
        .eq("id", user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const isSubscription = plan.mode === "subscription";

    let trialDays: number | undefined;
    if (isSubscription) {
      const { data: existingSub } = await admin
        .from("Subscription")
        .select("id")
        .eq("userId", user.id)
        .limit(1)
        .single();

      //offer 7-day trial only if this is their first subscription ever
      if (!existingSub) {
        trialDays = 7;
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: isSubscription ? "subscription" : "payment",
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        planId: plan.id,
      },
      success_url: `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}&plan=${plan.id}`,
      cancel_url: `${appUrl}/pricing?checkout=cancel&session_id={CHECKOUT_SESSION_ID}`,
      ...(isSubscription && {
        subscription_data: {
          metadata: {
            userId: user.id,
          },
          ...(trialDays && { trial_period_days: trialDays }),
        },
      }),
      ...(!isSubscription && {
        payment_intent_data: {
          metadata: {
            userId: user.id,
            planId: plan.id,
          },
        },
      }),
    });

    logActivity({
      action: "checkout.create",
      userId: user.id,
      ip: getClientIp(request),
      metadata: { planId: parsed.data.planId, sessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout";
    console.error("[checkout] Error:", message);
    return NextResponse.json(
      { error: message, code: "CHECKOUT_ERROR" },
      { status: 500 }
    );
  }
}
