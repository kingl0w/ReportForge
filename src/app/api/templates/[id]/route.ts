import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

/**
 *GET /api/templates/[id] — get a single template. Public templates are viewable by anyone.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();
    const { data: template, error } = await admin
      .from("UserTemplate")
      .select("id, userId, name, description, config, previewUrl, isPublic, createdAt")
      .eq("id", id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: "Template not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    //only the owner can access non-public templates
    if (template.userId !== user?.id) {
      return NextResponse.json(
        { error: "Not authorized", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    return NextResponse.json({ template });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch template";
    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 *PUT /api/templates/[id] — update a template (owner only).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = await request.json();
    const parsed = updateTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", code: "INVALID_INPUT", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    //verify ownership
    const { data: existing } = await admin
      .from("UserTemplate")
      .select("userId")
      .eq("id", id)
      .single();

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Template not found or not authorized", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.config !== undefined) updateData.config = parsed.data.config;

    const { error: updateError } = await admin
      .from("UserTemplate")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update template", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update template";
    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 *DELETE /api/templates/[id] — delete a template (owner only).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: existing } = await admin
      .from("UserTemplate")
      .select("userId")
      .eq("id", id)
      .single();

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Template not found or not authorized", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await admin
      .from("UserTemplate")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete template", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete template";
    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
