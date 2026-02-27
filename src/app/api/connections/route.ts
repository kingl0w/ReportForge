import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*GET /api/connections
 * list all active connections for the authenticated user.
 * strips encrypted credentials from the response.*/
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
    const { data: connections, error } = await admin
      .from("DataConnection")
      .select("id, provider, config, shopDomain, lastSyncAt, isActive, createdAt")
      .eq("userId", user.id)
      .eq("isActive", true)
      .order("createdAt", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch connections", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({ connections: connections ?? [] });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch connections";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
