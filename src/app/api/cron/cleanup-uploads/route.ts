import { NextRequest, NextResponse } from "next/server";
import { deleteExpiredUploads } from "@/lib/supabase/storage";

/*GET /api/cron/cleanup-uploads
 * Vercel Cron job — deletes uploaded data files older than 24 hours.
 * schedule: every hour.
 *
 * manual trigger: curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/cron/cleanup-uploads*/
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const deleted = await deleteExpiredUploads();

    return NextResponse.json({
      ok: true,
      deleted,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Cleanup failed";
    return NextResponse.json(
      { error: message, code: "CLEANUP_FAILED" },
      { status: 500 }
    );
  }
}
