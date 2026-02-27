import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWeeklyDigest } from "@/lib/email/resend";

/*GET /api/cron/weekly-digest
 * Vercel Cron job — sends a weekly digest email to Pro users with the weekly digest preference enabled.
 * schedule: every Monday at 9 AM UTC (1 hour after weekly report generation).
 *
 * manual trigger (non-Vercel): curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/weekly-digest*/
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const { data: settings, error: settingsError } = await admin
      .from("UserSettings")
      .select("userId")
      .eq("emailWeeklyDigest", true);

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: "Failed to fetch user settings", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    if (settings.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 0, failed: 0 });
    }

    const userIds = settings.map((s) => s.userId);

    const { data: proUsers } = await admin
      .from("User")
      .select("id, name, email")
      .in("id", userIds)
      .eq("plan", "PRO");

    if (!proUsers || proUsers.length === 0) {
      return NextResponse.json({ sent: 0, skipped: settings.length, failed: 0 });
    }

    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekStartDate = weekAgo.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const weekEndDate = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    for (const proUser of proUsers) {
      try {
        const { data: reports } = await admin
          .from("Report")
          .select("id, title, fileUrl, generatedAt, metadata")
          .eq("userId", proUser.id)
          .eq("status", "COMPLETE")
          .gte("generatedAt", weekAgo.toISOString())
          .order("generatedAt", { ascending: false });

        if (!reports || reports.length === 0) {
          skipped++;
          continue;
        }

        //generate fresh signed URLs (7 day validity)
        const digestReports = await Promise.all(
          reports.map(async (r) => {
            const pathMatch = r.fileUrl?.match(/reports\/[^?]+/);
            let downloadUrl = r.fileUrl ?? "";

            if (pathMatch) {
              const { data: signedData } = await admin.storage
                .from("reports")
                .createSignedUrl(pathMatch[0], 60 * 60 * 24 * 7);

              if (signedData?.signedUrl) {
                downloadUrl = signedData.signedUrl;
              }
            }

            return {
              name: r.title,
              downloadUrl,
              date: new Date(r.generatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
          })
        );

        let topInsight = "";
        const latestMetadata = reports[0]?.metadata as Record<string, unknown> | null;
        if (latestMetadata?.narrative) {
          const narrative = latestMetadata.narrative as { executiveSummary?: string };
          if (narrative.executiveSummary) {
            //use first sentence of the executive summary as the top insight
            const firstSentence = narrative.executiveSummary.split(/[.!?]/)[0];
            topInsight = firstSentence ? `${firstSentence}.` : "";
          }
        }

        await sendWeeklyDigest({
          to: proUser.email,
          reports: digestReports,
          totalGenerated: reports.length,
          topInsight,
          userName: proUser.name ?? "there",
          weekRange: `${weekStartDate} - ${weekEndDate}`,
        });

        sent++;
      } catch {
        failed++;
      }
    }

    //count users skipped because they're not Pro
    skipped += settings.length - proUsers.length;

    return NextResponse.json({ sent, skipped, failed });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Digest cron failed";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
