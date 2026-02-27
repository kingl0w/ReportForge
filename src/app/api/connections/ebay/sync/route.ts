import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ebaySyncRequestSchema } from "@/lib/ebay/validation";
import { EbayClient } from "@/lib/ebay/client";
import { transformAllData } from "@/lib/ebay/transform";
import type {
  EbayCredentials,
  EbayConnectionConfig,
} from "@/lib/ebay/types";

/*POST /api/connections/ebay/sync
 * manual sync: fetch eBay data and return a DataSet for the report wizard.*/
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
    const parsed = ebaySyncRequestSchema.safeParse(body);
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

    const { connectionId, startDate, endDate } = parsed.data;

    const admin = createAdminClient();
    const { data: connection, error: fetchError } = await admin
      .from("DataConnection")
      .select("*")
      .eq("id", connectionId)
      .eq("userId", user.id)
      .eq("isActive", true)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: "Connection not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const credentials = connection.credentials as EbayCredentials;
    const config = connection.config as EbayConnectionConfig;
    const client = EbayClient.fromEncrypted(
      credentials,
      connectionId,
      config.marketplace
    );

    const { orders, transactions } = await client.fetchSalesOverview({
      startDate,
      endDate,
    });

    const storeName = config.username ?? "eBay";
    const dataSet = transformAllData(orders, transactions, storeName);

    await admin
      .from("DataConnection")
      .update({ lastSyncAt: new Date().toISOString() })
      .eq("id", connectionId);

    return NextResponse.json({ dataSet });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json(
      { error: message, code: "SYNC_ERROR" },
      { status: 500 }
    );
  }
}
