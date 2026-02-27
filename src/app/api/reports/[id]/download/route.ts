import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, getClientIp } from "@/lib/logging/activity";

/**
 *GET /api/reports/[id]/download
 *
 *returns a signed download URL for the report file.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const admin = createAdminClient();
    const { data: report, error } = await admin
      .from("Report")
      .select("id, title, fileUrl, status, format")
      .eq("id", id)
      .eq("userId", user.id)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: "Report not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (report.status !== "COMPLETE" || !report.fileUrl) {
      return NextResponse.json(
        { error: "Report is not ready for download", code: "NOT_READY" },
        { status: 400 }
      );
    }

    //signed URL valid for 1 hour
    const path = extractStoragePath(report.fileUrl);
    if (!path) {
      return NextResponse.json(
        { error: "File not found in storage", code: "FILE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { data: signedData, error: signError } = await admin.storage
      .from("reports")
      .createSignedUrl(path, 3600);

    logActivity({
      action: "report.download",
      userId: user.id,
      ip: getClientIp(_request),
      metadata: { reportId: id, format: report.format },
    });

    if (signError || !signedData?.signedUrl) {
      console.error("[reports/[id]/download] Sign URL error:", signError);
      //fall back to the public URL
      return NextResponse.json({
        downloadUrl: report.fileUrl,
        title: report.title,
        format: report.format,
      });
    }

    return NextResponse.json({
      downloadUrl: signedData.signedUrl,
      title: report.title,
      format: report.format,
    });
  } catch (error: unknown) {
    console.error("[reports/[id]/download] GET error:", error);
    return NextResponse.json(
      { error: "Failed to generate download link", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

function extractStoragePath(url: string): string | null {
  try {
    const u = new URL(url);
    //match both public and signed URLs
    const match = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/reports\/(.+)/);
    if (!match) return null;
    return match[1];
  } catch {
    return null;
  }
}
