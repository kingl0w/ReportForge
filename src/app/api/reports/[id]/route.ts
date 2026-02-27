import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 *GET /api/reports/[id]
 *
 *returns the current status and metadata of a report.
 *used by the client to poll generation progress.
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
      .select(
        "id, title, status, templateId, format, fileUrl, fileSize, pageCount, dataSourceType, metadata, errorMessage, generatedAt, createdAt, updatedAt"
      )
      .eq("id", id)
      .eq("userId", user.id)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: "Report not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error: unknown) {
    console.error("[reports/[id]] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 *PATCH /api/reports/[id]
 *
 *currently only supports toggling `isPublic`.
 */
export async function PATCH(
  request: NextRequest,
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
    const body = await request.json();

    //only isPublic is updatable for now
    const update: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (typeof body.isPublic === "boolean") {
      update.isPublic = body.isPublic;
    }

    const admin = createAdminClient();
    const { data: report, error } = await admin
      .from("Report")
      .update(update)
      .eq("id", id)
      .eq("userId", user.id)
      .select("id, isPublic")
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: "Report not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error: unknown) {
    console.error("[reports/[id]] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update report", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 *DELETE /api/reports/[id]
 *
 *deletes a report and its associated file from storage.
 */
export async function DELETE(
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

    //fetch file URL before deleting so we can clean up storage
    const { data: report, error: fetchError } = await admin
      .from("Report")
      .select("id, fileUrl, rawDataUrl")
      .eq("id", id)
      .eq("userId", user.id)
      .single();

    if (fetchError || !report) {
      return NextResponse.json(
        { error: "Report not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await admin
      .from("Report")
      .delete()
      .eq("id", id)
      .eq("userId", user.id);

    if (deleteError) {
      console.error("[reports/[id]] DELETE error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete report", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    //fire-and-forget storage cleanup
    if (report.fileUrl) {
      const path = extractStoragePath(report.fileUrl, "reports");
      if (path) {
        admin.storage.from("reports").remove([path]).catch(() => {});
      }
    }
    if (report.rawDataUrl) {
      const path = extractStoragePath(report.rawDataUrl, "uploads");
      if (path) {
        admin.storage.from("uploads").remove([path]).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[reports/[id]] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete report", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 *extract storage path from a Supabase Storage public URL.
 *e.g. ".../storage/v1/object/public/reports/userId/file.pdf" -> "userId/file.pdf"
 */
function extractStoragePath(url: string, bucket: string): string | null {
  try {
    const u = new URL(url);
    //match both public and signed URLs
    const re = new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/(.+)`);
    const match = u.pathname.match(re);
    if (!match) return null;
    return match[1];
  } catch {
    return null;
  }
}
