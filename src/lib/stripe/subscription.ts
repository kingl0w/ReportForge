import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanId } from "./plans";

interface UserSubscription {
  plan: PlanId;
  status: string | null;
  reportsUsed: number;
  reportsLimit: number;
  reportsRemaining: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function getUserSubscription(
  userId: string
): Promise<UserSubscription> {
  const admin = createAdminClient();

  const { data: userData } = await admin
    .from("User")
    .select("plan, reportsUsed, reportsLimit")
    .eq("id", userId)
    .single();

  if (!userData) {
    return {
      plan: "FREE",
      status: null,
      reportsUsed: 0,
      reportsLimit: 1,
      reportsRemaining: 1,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const { data: subData } = await admin
    .from("Subscription")
    .select("status, currentPeriodEnd, cancelAtPeriodEnd, currentPeriodStart")
    .eq("userId", userId)
    .single();

  let reportsUsed = userData.reportsUsed;

  //for Pro users, count reports within the current billing period
  if (userData.plan === "PRO" && subData?.currentPeriodStart) {
    const periodStart = new Date(subData.currentPeriodStart);
    const { count } = await admin
      .from("Report")
      .select("id", { count: "exact", head: true })
      .eq("userId", userId)
      .gte("createdAt", periodStart.toISOString());

    reportsUsed = count ?? 0;
  }

  const reportsRemaining = Math.max(0, userData.reportsLimit - reportsUsed);

  return {
    plan: userData.plan as PlanId,
    status: subData?.status ?? null,
    reportsUsed,
    reportsLimit: userData.reportsLimit,
    reportsRemaining,
    currentPeriodEnd: subData?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: subData?.cancelAtPeriodEnd ?? false,
  };
}

/**returns false if plan is PAUSED, subscription lapsed, or report limit hit*/
export async function canGenerateReport(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);

  if (sub.status === "PAUSED" || sub.status === "CANCELED") {
    return false;
  }

  return sub.reportsRemaining > 0;
}

export async function incrementReportCount(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: userData } = await admin
    .from("User")
    .select("reportsUsed")
    .eq("id", userId)
    .single();

  if (!userData) return;

  await admin
    .from("User")
    .update({ reportsUsed: userData.reportsUsed + 1 })
    .eq("id", userId);
}

/**called by webhook on subscription renewal*/
export async function resetMonthlyCount(userId: string): Promise<void> {
  const admin = createAdminClient();

  await admin.from("User").update({ reportsUsed: 0 }).eq("id", userId);
}
