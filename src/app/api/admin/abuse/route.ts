import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSecret } from "@/lib/admin";

interface AbuseFlag {
  type: string;
  identifier: string;
  reason: string;
  count: number;
}

/*GET /api/admin/abuse -- detect suspicious usage patterns.*/
export async function GET(request: NextRequest) {
  const denied = requireAdminSecret(request);
  if (denied) return denied;

  const admin = createAdminClient();
  const flags: AbuseFlag[] = [];

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  //IPs generating >50 reports/day
  const { data: reportsByIp } = await admin
    .from("ActivityLog")
    .select("ip")
    .eq("action", "report.generate")
    .gte("createdAt", dayAgo)
    .not("ip", "is", null);

  if (reportsByIp) {
    const ipCounts: Record<string, number> = {};
    for (const r of reportsByIp) {
      const ip = r.ip as string;
      ipCounts[ip] = (ipCounts[ip] ?? 0) + 1;
    }
    for (const [ip, count] of Object.entries(ipCounts)) {
      if (count > 50) {
        flags.push({
          type: "high_volume_ip",
          identifier: ip,
          reason: `${count} reports generated from this IP in 24h (threshold: 50)`,
          count,
        });
      }
    }
  }

  //users generating >20 reports/hour
  const { data: reportsByUser } = await admin
    .from("ActivityLog")
    .select("userId")
    .eq("action", "report.generate")
    .gte("createdAt", hourAgo)
    .not("userId", "is", null);

  if (reportsByUser) {
    const userCounts: Record<string, number> = {};
    for (const r of reportsByUser) {
      const uid = r.userId as string;
      userCounts[uid] = (userCounts[uid] ?? 0) + 1;
    }
    for (const [userId, count] of Object.entries(userCounts)) {
      if (count > 20) {
        flags.push({
          type: "high_volume_user",
          identifier: userId,
          reason: `${count} reports generated in 1h (threshold: 20)`,
          count,
        });
      }
    }
  }

  //multiple accounts from same IP in 24h
  const { data: signupsByIp } = await admin
    .from("ActivityLog")
    .select("ip, userId")
    .eq("action", "auth.signup")
    .gte("createdAt", dayAgo)
    .not("ip", "is", null);

  if (signupsByIp) {
    const ipUsers: Record<string, Set<string>> = {};
    for (const r of signupsByIp) {
      const ip = r.ip as string;
      const uid = r.userId as string;
      if (!ipUsers[ip]) ipUsers[ip] = new Set();
      ipUsers[ip].add(uid);
    }
    for (const [ip, users] of Object.entries(ipUsers)) {
      if (users.size > 3) {
        flags.push({
          type: "multi_account_ip",
          identifier: ip,
          reason: `${users.size} accounts created from this IP in 24h`,
          count: users.size,
        });
      }
    }
  }

  //rate limit hits >20 from same IP in 1 hour
  const { data: rlHitsByIp } = await admin
    .from("ActivityLog")
    .select("ip")
    .eq("action", "ratelimit.hit")
    .gte("createdAt", hourAgo)
    .not("ip", "is", null);

  if (rlHitsByIp) {
    const ipRlCounts: Record<string, number> = {};
    for (const r of rlHitsByIp) {
      const ip = r.ip as string;
      ipRlCounts[ip] = (ipRlCounts[ip] ?? 0) + 1;
    }
    for (const [ip, count] of Object.entries(ipRlCounts)) {
      if (count > 20) {
        flags.push({
          type: "excessive_rate_limits",
          identifier: ip,
          reason: `${count} rate limit hits from this IP in 1h (threshold: 20)`,
          count,
        });
      }
    }
  }

  return NextResponse.json({
    flags,
    flagCount: flags.length,
    checkedAt: now.toISOString(),
  });
}
