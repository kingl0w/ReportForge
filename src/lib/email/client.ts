import { createHmac } from "node:crypto";
import { Resend } from "resend";

let resendInstance: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? "reports@reportforge.com";
}

/**HMAC-signed unsubscribe token, valid for 30 days. Consumed by GET /api/settings/unsubscribe.*/
export function makeUnsubscribeUrl(
  userId: string,
  preference: "emailOnReportComplete" | "emailWeeklyDigest" | "emailMarketingUpdates"
): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) return "";

  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = `${userId}:${preference}:${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");

  const token = Buffer.from(
    JSON.stringify({ userId, preference, exp, sig })
  ).toString("base64url");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/settings/unsubscribe?token=${token}`;
}
