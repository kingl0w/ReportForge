import { createAdminClient } from "@/lib/supabase/admin";

type ActivityAction =
  | "auth.login"
  | "auth.signup"
  | "report.generate"
  | "report.complete"
  | "report.download"
  | "checkout.create"
  | "subscription.change"
  | "connection.create"
  | "settings.update"
  | "ratelimit.hit";

interface ActivityParams {
  action: ActivityAction;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

/**
 * Log an activity event. Fire-and-forget — never blocks the caller.
 * Silently swallows errors so it can never break request handling.
 */
export function logActivity(params: ActivityParams): void {
  const { action, userId, metadata, ip } = params;

  Promise.resolve().then(async () => {
    try {
      const admin = createAdminClient();
      const { error } = await admin
        .from("ActivityLog")
        .insert({
          userId: userId ?? null,
          action,
          metadata: metadata ?? null,
          ip: ip ?? null,
        });

      if (error) {
        console.error("[activity-log] Insert failed:", error.message);
      }
    } catch (err: unknown) {
      console.error("[activity-log] Unexpected error:", err);
    }
  });
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? null;
}
