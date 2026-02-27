import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcome } from "@/lib/email/resend";
import { logActivity } from "@/lib/logging/activity";

/*validate redirect path to prevent open redirects*/
function sanitizeRedirect(value: string | null): string {
  const fallback = "/dashboard";
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("://")) return fallback;
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = sanitizeRedirect(searchParams.get("redirect"));

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      try {
        const admin = createAdminClient();
        const forwarded = request.headers.get("x-forwarded-for");
        const ip = forwarded?.split(",")[0]?.trim() ?? null;

        const { data: existingUser } = await admin
          .from("User")
          .select("signupIp")
          .eq("id", data.user.id)
          .single();

        const isNewUser = existingUser && existingUser.signupIp === null;

        if (ip && isNewUser) {
          await admin
            .from("User")
            .update({ signupIp: ip })
            .eq("id", data.user.id);
        }

        if (isNewUser) {
          logActivity({
            action: "auth.signup",
            userId: data.user.id,
            ip,
            metadata: { provider: data.user.app_metadata?.provider ?? "email" },
          });
        } else {
          logActivity({
            action: "auth.login",
            userId: data.user.id,
            ip,
            metadata: { provider: data.user.app_metadata?.provider ?? "email" },
          });
        }

        if (isNewUser && data.user.email) {
          const userName =
            data.user.user_metadata?.full_name ??
            data.user.user_metadata?.name ??
            data.user.email.split("@")[0];

          await sendWelcome({
            to: data.user.email,
            userName,
          });
        }
      } catch {
        //non-critical -- don't block auth flow
      }

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  //auth code exchange failed
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
