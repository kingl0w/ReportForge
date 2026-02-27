import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";

const signupLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, //24 hours
  maxRequests: 3,
  message: "Too many signups from this network. Please try again later.",
});

/*POST /api/auth/signup-check
 *
 * unauthenticated endpoint. rate limits signups by IP address
 * to prevent abuse (max 3 signups per IP per 24 hours).*/
export async function POST(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";

  const result = await signupLimiter.checkAsync(ip);

  if (!result.allowed) {
    return NextResponse.json(
      { allowed: false, message: result.message },
      { status: 429 }
    );
  }

  return NextResponse.json({ allowed: true });
}
