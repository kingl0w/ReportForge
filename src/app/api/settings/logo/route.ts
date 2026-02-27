import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_SIZE = 2 * 1024 * 1024; //2MB

/**
 *POST /api/settings/logo
 *
 *upload a brand logo. Pro only. Accepts multipart/form-data with a "logo" field.
 */
export async function POST(request: NextRequest) {
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

    const admin = createAdminClient();

    //Pro only
    const { data: userData } = await admin
      .from("User")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (userData?.plan !== "PRO") {
      return NextResponse.json(
        { error: "Logo upload requires a Pro subscription", code: "PRO_REQUIRED" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("logo");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No logo file provided", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Allowed: PNG, JPG, WebP",
          code: "INVALID_FILE_TYPE",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB", code: "FILE_TOO_LARGE" },
        { status: 400 }
      );
    }

    //derive extension from mime type
    const extMap: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
    };
    const ext = extMap[file.type] ?? "png";
    const path = `logos/${user.id}/logo.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("logos")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}`, code: "UPLOAD_ERROR" },
        { status: 500 }
      );
    }

    const { data: urlData } = admin.storage
      .from("logos")
      .getPublicUrl(path);

    const logoUrl = urlData.publicUrl;

    const { data: existing } = await admin
      .from("UserSettings")
      .select("id")
      .eq("userId", user.id)
      .single();

    if (existing) {
      await admin
        .from("UserSettings")
        .update({ logoUrl })
        .eq("userId", user.id);
    } else {
      await admin
        .from("UserSettings")
        .insert({ userId: user.id, logoUrl });
    }

    return NextResponse.json({ logoUrl });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to upload logo";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 *DELETE /api/settings/logo
 *
 *remove brand logo. Pro only.
 */
export async function DELETE() {
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

    const admin = createAdminClient();

    //Pro only
    const { data: userData } = await admin
      .from("User")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (userData?.plan !== "PRO") {
      return NextResponse.json(
        { error: "Logo management requires a Pro subscription", code: "PRO_REQUIRED" },
        { status: 403 }
      );
    }

    //remove all logo files for this user (any extension)
    const { data: files } = await admin.storage
      .from("logos")
      .list(user.id);

    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      await admin.storage.from("logos").remove(paths);
    }

    await admin
      .from("UserSettings")
      .update({ logoUrl: null })
      .eq("userId", user.id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete logo";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
