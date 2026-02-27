import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { resetMonthlyCount } from "@/lib/stripe/subscription";
import { sendPaymentFailed, sendSubscriptionConfirmed } from "@/lib/email/resend";
import { logActivity } from "@/lib/logging/activity";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**grace period in days after a failed payment before downgrading.*/
const GRACE_PERIOD_DAYS = 3;

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 *returns true if the event was already handled (duplicate).
 */
async function isDuplicate(
  admin: AdminClient,
  stripeEventId: string
): Promise<boolean> {
  const { data } = await admin
    .from("StripeEvent")
    .select("id")
    .eq("stripeEventId", stripeEventId)
    .single();

  return !!data;
}

/**
 *log a Stripe event for idempotency tracking and debugging.
 */
async function logEvent(
  admin: AdminClient,
  event: Stripe.Event
): Promise<void> {
  await admin.from("StripeEvent").insert({
    stripeEventId: event.id,
    type: event.type,
    data: event.data.object as unknown,
    processedAt: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  //Next.js API routes run to completion even after the response is sent,
  //so we return 200 early and let the handler finish asynchronously.
  const admin = createAdminClient();

  try {
    if (await isDuplicate(admin, event.id)) {
      console.log(`[stripe-webhook] Duplicate event skipped: ${event.id}`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    await logEvent(admin, event);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(
          event.data.object as Stripe.Checkout.Session,
          admin
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          admin
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          admin
        );
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(
          event.data.object as Stripe.Invoice,
          admin
        );
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(
          event.data.object as Stripe.Invoice,
          admin
        );
        break;

      case "customer.subscription.paused":
        await handleSubscriptionPaused(
          event.data.object as Stripe.Subscription,
          admin
        );
        break;

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed";
    console.error(`[stripe-webhook] Error processing ${event.type}:`, message);
    //still return 200 to avoid Stripe retrying events we already logged.
    //the stripe_events table tracks the event; ops can investigate failures.
    return NextResponse.json({ received: true, error: message });
  }

  return NextResponse.json({ received: true });
}

async function resolveUserIdFromSubscription(
  subscriptionId: string,
  metadata: Stripe.Metadata | undefined,
  admin: AdminClient
): Promise<string | null> {
  //metadata is set during checkout; fall back to DB lookup
  if (metadata?.userId) return metadata.userId;

  const { data } = await admin
    .from("Subscription")
    .select("userId")
    .eq("stripeSubscriptionId", subscriptionId)
    .single();

  return data?.userId ?? null;
}

async function handleCheckoutComplete(
  session: Stripe.Checkout.Session,
  admin: AdminClient
) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.warn("[stripe-webhook] checkout.session.completed missing userId metadata");
    return;
  }

  const planId = session.metadata?.planId;

  if (session.mode === "subscription" && session.subscription) {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const firstItem = sub.items.data[0];

    await admin.from("Subscription").upsert(
      {
        userId,
        stripeSubscriptionId: sub.id,
        stripePriceId: firstItem?.price.id ?? "",
        status: "ACTIVE",
        currentPeriodStart: new Date(
          (firstItem?.current_period_start ?? 0) * 1000
        ).toISOString(),
        currentPeriodEnd: new Date(
          (firstItem?.current_period_end ?? 0) * 1000
        ).toISOString(),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
      { onConflict: "userId" }
    );

    await admin
      .from("User")
      .update({
        plan: "PRO",
        reportsLimit: 100,
        reportsUsed: 0,
        stripeCustomerId:
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? undefined,
      })
      .eq("id", userId);

    const { data: proUser } = await admin
      .from("User")
      .select("name, email")
      .eq("id", userId)
      .single();

    if (proUser?.email) {
      await sendSubscriptionConfirmed({
        to: proUser.email,
        planName: "Pro",
        userName: proUser.name ?? "there",
      });
    }

    logActivity({
      action: "subscription.change",
      userId,
      metadata: { change: "pro_activated", subscriptionId: sub.id },
    });

    console.log(`[stripe-webhook] PRO subscription activated for user ${userId}`);
  } else if (session.mode === "payment" && planId === "PER_REPORT") {
    //one-time report purchase: credit 1 report
    const { data: userData } = await admin
      .from("User")
      .select("reportsLimit, plan")
      .eq("id", userId)
      .single();

    if (userData) {
      const newLimit = userData.reportsLimit + 1;
      const updates: Record<string, unknown> = { reportsLimit: newLimit };

      //upgrade from FREE to PAY_PER_REPORT on first purchase
      if (userData.plan === "FREE") {
        updates.plan = "PAY_PER_REPORT";
      }

      await admin.from("User").update(updates).eq("id", userId);
      console.log(`[stripe-webhook] Per-report credit added for user ${userId}`);
    }
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  admin: AdminClient
) {
  const userId = await resolveUserIdFromSubscription(
    subscription.id,
    subscription.metadata,
    admin
  );
  if (!userId) {
    console.warn(`[stripe-webhook] subscription.updated — could not resolve userId for ${subscription.id}`);
    return;
  }

  const statusMap: Record<string, string> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
    trialing: "ACTIVE",
    unpaid: "PAST_DUE",
    paused: "PAUSED",
  };

  const dbStatus = statusMap[subscription.status] ?? "INCOMPLETE";
  const firstItem = subscription.items.data[0];

  await admin
    .from("Subscription")
    .update({
      status: dbStatus,
      stripePriceId: firstItem?.price.id ?? "",
      currentPeriodStart: new Date(
        (firstItem?.current_period_start ?? 0) * 1000
      ).toISOString(),
      currentPeriodEnd: new Date(
        (firstItem?.current_period_end ?? 0) * 1000
      ).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    })
    .eq("stripeSubscriptionId", subscription.id);

  //downgrade user if subscription is no longer active
  if (
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired"
  ) {
    await admin
      .from("User")
      .update({ plan: "FREE", reportsLimit: 1 })
      .eq("id", userId);
    logActivity({
      action: "subscription.change",
      userId,
      metadata: { change: "downgraded_to_free", reason: subscription.status },
    });

    console.log(`[stripe-webhook] User ${userId} downgraded to FREE (sub ${subscription.status})`);
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  admin: AdminClient
) {
  const userId = await resolveUserIdFromSubscription(
    subscription.id,
    subscription.metadata,
    admin
  );
  if (!userId) {
    console.warn(`[stripe-webhook] subscription.deleted — could not resolve userId for ${subscription.id}`);
    return;
  }

  await admin
    .from("Subscription")
    .update({ status: "CANCELED" })
    .eq("stripeSubscriptionId", subscription.id);

  await admin
    .from("User")
    .update({ plan: "FREE", reportsLimit: 1, reportsUsed: 0 })
    .eq("id", userId);

  logActivity({
    action: "subscription.change",
    userId,
    metadata: { change: "deleted", subscriptionId: subscription.id },
  });

  console.log(`[stripe-webhook] Subscription deleted, user ${userId} downgraded to FREE`);
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  admin: AdminClient
) {
  const subDetails = invoice.parent?.subscription_details;
  if (!subDetails?.subscription) return;

  const subscriptionId =
    typeof subDetails.subscription === "string"
      ? subDetails.subscription
      : subDetails.subscription.id;

  //only reset on recurring invoices, not the initial subscription creation
  //billing_reason: "subscription_cycle" = renewal, "subscription_create" = first payment
  if (invoice.billing_reason !== "subscription_cycle") return;

  const userId = await resolveUserIdFromSubscription(
    subscriptionId,
    undefined,
    admin
  );
  if (!userId) {
    console.warn(`[stripe-webhook] invoice.payment_succeeded — could not resolve userId for sub ${subscriptionId}`);
    return;
  }

  await resetMonthlyCount(userId);

  //ensure subscription status is active (may have been PAST_DUE from a prior failure)
  await admin
    .from("Subscription")
    .update({ status: "ACTIVE" })
    .eq("stripeSubscriptionId", subscriptionId);

  //restore PRO plan in case it was degraded
  await admin
    .from("User")
    .update({ plan: "PRO", reportsLimit: 100 })
    .eq("id", userId);

  console.log(`[stripe-webhook] Renewal payment succeeded for user ${userId}, report count reset`);
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  admin: AdminClient
) {
  const subDetails = invoice.parent?.subscription_details;
  if (!subDetails?.subscription) return;

  const subscriptionId =
    typeof subDetails.subscription === "string"
      ? subDetails.subscription
      : subDetails.subscription.id;

  await admin
    .from("Subscription")
    .update({ status: "PAST_DUE" })
    .eq("stripeSubscriptionId", subscriptionId);

  const userId = await resolveUserIdFromSubscription(
    subscriptionId,
    undefined,
    admin
  );

  if (!userId) {
    console.warn(`[stripe-webhook] invoice.payment_failed — could not resolve userId for sub ${subscriptionId}`);
    return;
  }

  const { data: userData } = await admin
    .from("User")
    .select("email, name")
    .eq("id", userId)
    .single();

  if (!userData?.email) return;

  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

  //Stripe typically retries ~3 days after failure
  const nextRetry = new Date();
  nextRetry.setDate(nextRetry.getDate() + 3);

  const dateOpts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  await sendPaymentFailed({
    to: userData.email,
    nextRetryDate: nextRetry.toLocaleDateString("en-US", dateOpts),
    userName: userData.name ?? "there",
  });

  console.log(`[stripe-webhook] Payment failed for user ${userId}, grace period set (${GRACE_PERIOD_DAYS} days)`);
}

async function handleSubscriptionPaused(
  subscription: Stripe.Subscription,
  admin: AdminClient
) {
  const userId = await resolveUserIdFromSubscription(
    subscription.id,
    subscription.metadata,
    admin
  );
  if (!userId) {
    console.warn(`[stripe-webhook] subscription.paused — could not resolve userId for ${subscription.id}`);
    return;
  }

  await admin
    .from("Subscription")
    .update({ status: "PAUSED" })
    .eq("stripeSubscriptionId", subscription.id);

  logActivity({
    action: "subscription.change",
    userId,
    metadata: { change: "paused", subscriptionId: subscription.id },
  });

  console.log(`[stripe-webhook] Subscription paused for user ${userId}`);
}
