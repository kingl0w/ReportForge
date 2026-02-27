import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSecret } from "@/lib/admin";

/*GET /api/admin/activity -- query activity logs with optional filters.*/
export async function GET(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const action = params.get("action");
  const userId = params.get("userId");
  const ip = params.get("ip");
  const since = params.get("since");
  const limitParam = params.get("limit");

  const limit = Math.min(Math.max(parseInt(limitParam ?? "100", 10) || 100, 1), 1000);
  const sinceDate = since
    ? new Date(since).toISOString()
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  let query = admin
    .from("ActivityLog")
    .select("*")
    .gte("createdAt", sinceDate)
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (action) query = query.eq("action", action);
  if (userId) query = query.eq("userId", userId);
  if (ip) query = query.eq("ip", ip);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to query activity logs", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ logs: data, count: data?.length ?? 0 });
}
