import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  config: z.record(z.string(), z.unknown()),
});

/**
 *GET /api/templates — list the authenticated user's custom templates.
 */
export async function GET() {
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
    const { data: templates, error } = await admin
      .from("UserTemplate")
      .select("id, name, description, config, previewUrl, isPublic, createdAt")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch templates", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: templates ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch templates";
    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 *POST /api/templates — create a new custom template.
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

    const body = await request.json();
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", code: "INVALID_INPUT", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, description, config } = parsed.data;
    const templateId = crypto.randomUUID();

    const admin = createAdminClient();
    const { error: insertError } = await admin.from("UserTemplate").insert({
      id: templateId,
      userId: user.id,
      name,
      description: description ?? null,
      config,
      isPublic: false,
    });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create template", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: templateId }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create template";
    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
