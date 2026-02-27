import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSecret } from "@/lib/admin";

/*GET /api/admin/stats -- aggregate stats for the admin dashboard.*/
export async function GET(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const admin = createAdminClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    usersResult,
    reportsAllResult,
    reportsTodayResult,
    reportsWeekResult,
    activeSubsResult,
    reportsCompleteResult,
    rateLimitHitsResult,
  ] = await Promise.all([
    admin.from("User").select("id", { count: "exact", head: true }),
    admin.from("Report").select("id", { count: "exact", head: true }),
    admin.from("Report").select("id", { count: "exact", head: true }).gte("createdAt", todayStart),
    admin.from("Report").select("id", { count: "exact", head: true }).gte("createdAt", weekStart),
    admin.from("Subscription").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    admin.from("Report").select("templateId").eq("status", "COMPLETE"),
    admin
      .from("ActivityLog")
      .select("id", { count: "exact", head: true })
      .eq("action", "ratelimit.hit")
      .gte("createdAt", todayStart),
  ]);

  const templateCounts: Record<string, number> = {};
  if (reportsCompleteResult.data) {
    for (const r of reportsCompleteResult.data) {
      const tid = (r.templateId as string) ?? "unknown";
      templateCounts[tid] = (templateCounts[tid] ?? 0) + 1;
    }
  }

  const { data: topUsersRaw } = await admin
    .from("Report")
    .select("userId")
    .order("createdAt", { ascending: false })
    .limit(500);

  const userReportCounts: Record<string, number> = {};
  if (topUsersRaw) {
    for (const r of topUsersRaw) {
      const uid = r.userId as string;
      userReportCounts[uid] = (userReportCounts[uid] ?? 0) + 1;
    }
  }
  const topUsers = Object.entries(userReportCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, count]) => ({ userId, reportCount: count }));

  return NextResponse.json({
    totalUsers: usersResult.count ?? 0,
    totalReports: reportsAllResult.count ?? 0,
    reportsToday: reportsTodayResult.count ?? 0,
    reportsThisWeek: reportsWeekResult.count ?? 0,
    activeSubscriptions: activeSubsResult.count ?? 0,
    rateLimitHitsToday: rateLimitHitsResult.count ?? 0,
    reportsByTemplate: templateCounts,
    topUsers,
  });
}
