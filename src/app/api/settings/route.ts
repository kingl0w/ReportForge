import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, getClientIp } from "@/lib/logging/activity";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const patchSchema = z.object({
  emailOnReportComplete: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),
  emailMarketingUpdates: z.boolean().optional(),
  brandPrimary: z.string().regex(HEX_COLOR).nullable().optional(),
  brandSecondary: z.string().regex(HEX_COLOR).nullable().optional(),
  brandAccent: z.string().regex(HEX_COLOR).nullable().optional(),
  customFooterText: z.string().max(200).nullable().optional(),
  removeReportForgeBranding: z.boolean().optional(),
});

const BRANDING_FIELDS = new Set([
  "brandPrimary",
  "brandSecondary",
  "brandAccent",
  "customFooterText",
  "removeReportForgeBranding",
]);

/**
 *GET /api/settings
 *
 *returns user settings, creating default row if none exists.
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
    let { data: settings } = await admin
      .from("UserSettings")
      .select("*")
      .eq("userId", user.id)
      .single();

    //create default settings if none exist
    if (!settings) {
      const { data: created, error: createError } = await admin
        .from("UserSettings")
        .insert({ userId: user.id })
        .select("*")
        .single();

      if (createError) {
        return NextResponse.json(
          { error: "Failed to create settings", code: "DB_ERROR" },
          { status: 500 }
        );
      }
      settings = created;
    }

    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch settings";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 *PATCH /api/settings
 *
 *branding fields are gated to Pro users.
 */
export async function PATCH(request: NextRequest) {
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
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          code: "INVALID_INPUT",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    //branding fields require Pro plan
    const hasBrandingUpdates = Object.keys(updates).some((k) =>
      BRANDING_FIELDS.has(k)
    );

    if (hasBrandingUpdates) {
      const admin = createAdminClient();
      const { data: userData } = await admin
        .from("User")
        .select("plan")
        .eq("id", user.id)
        .single();

      if (userData?.plan !== "PRO") {
        return NextResponse.json(
          {
            error: "White-label branding requires a Pro subscription",
            code: "PRO_REQUIRED",
          },
          { status: 403 }
        );
      }
    }

    const admin = createAdminClient();

    //upsert: create settings row if it doesn't exist
    const { data: existing } = await admin
      .from("UserSettings")
      .select("id")
      .eq("userId", user.id)
      .single();

    let settings;
    if (existing) {
      const { data, error } = await admin
        .from("UserSettings")
        .update(updates)
        .eq("userId", user.id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to update settings", code: "DB_ERROR" },
          { status: 500 }
        );
      }
      settings = data;
    } else {
      const { data, error } = await admin
        .from("UserSettings")
        .insert({ userId: user.id, ...updates })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to create settings", code: "DB_ERROR" },
          { status: 500 }
        );
      }
      settings = data;
    }

    logActivity({
      action: "settings.update",
      userId: user.id,
      ip: getClientIp(request),
      metadata: { fields: Object.keys(updates) },
    });

    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update settings";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
