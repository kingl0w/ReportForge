import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 *GET /api/subscription
 *
 *returns current user's plan, usage, and subscription status.
 */
export async function GET() {
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

    let { data: userData } = await admin
      .from("User")
      .select("plan, reportsUsed, reportsLimit, stripeCustomerId")
      .eq("id", user.id)
      .single();

    //auto-create User row if auth user exists but public row is missing
    //(e.g. DB trigger hasn't been applied or race condition on first login)
    if (!userData) {
      //check for stale row with same email but different auth ID
      //(happens when an auth user is deleted and re-created)
      const { data: staleRow } = await admin
        .from("User")
        .select("id")
        .eq("email", user.email!)
        .single();

      if (staleRow && staleRow.id !== user.id) {
        //migrate stale row to match the new auth user ID
        const { data: updated, error: updateError } = await admin
          .from("User")
          .update({
            id: user.id,
            name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
            avatarUrl: user.user_metadata?.avatar_url ?? null,
            updatedAt: new Date().toISOString(),
          })
          .eq("email", user.email!)
          .select("plan, reportsUsed, reportsLimit, stripeCustomerId")
          .single();

        if (updateError) {
          console.error("[subscription] User ID migration failed:", updateError);
        }
        userData = updated;
      } else {
        const { data: created, error: upsertError } = await admin
          .from("User")
          .upsert(
            {
              id: user.id,
              email: user.email!,
              name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
              avatarUrl: user.user_metadata?.avatar_url ?? null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { onConflict: "id" }
          )
          .select("plan, reportsUsed, reportsLimit, stripeCustomerId")
          .single();

        if (upsertError) {
          console.error("[subscription] User upsert failed:", upsertError);
        }
        userData = created;
      }
    }

    if (!userData) {
      return NextResponse.json(
        { error: "Failed to load user data", code: "USER_NOT_FOUND" },
        { status: 500 }
      );
    }

    //fetch subscription details if exists
    const { data: subData } = await admin
      .from("Subscription")
      .select("status, currentPeriodEnd, cancelAtPeriodEnd")
      .eq("userId", user.id)
      .single();

    let { reportsUsed } = userData;

    //for Pro users, sync usage to current billing period
    if (userData.plan === "PRO" && subData?.currentPeriodEnd) {
      const { data: subDetails } = await admin
        .from("Subscription")
        .select("currentPeriodStart")
        .eq("userId", user.id)
        .single();

      if (subDetails?.currentPeriodStart) {
        const periodStart = new Date(subDetails.currentPeriodStart);
        const { count } = await admin
          .from("Report")
          .select("id", { count: "exact", head: true })
          .eq("userId", user.id)
          .gte("createdAt", periodStart.toISOString());

        reportsUsed = count ?? 0;
      }
    }

    const reportsRemaining = Math.max(
      0,
      userData.reportsLimit - reportsUsed
    );

    const canGenerateReport = reportsRemaining > 0;

    const response = NextResponse.json({
      plan: userData.plan,
      reportsUsed,
      reportsLimit: userData.reportsLimit,
      reportsRemaining,
      canGenerateReport,
      hasStripeCustomer: !!userData.stripeCustomerId,
      subscription: subData
        ? {
            status: subData.status,
            currentPeriodEnd: subData.currentPeriodEnd,
            cancelAtPeriodEnd: subData.cancelAtPeriodEnd,
          }
        : null,
    });

    response.headers.set(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=60"
    );

    return response;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch subscription";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
