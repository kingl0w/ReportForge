import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncRequestSchema } from "@/lib/shopify/validation";
import { decrypt } from "@/lib/crypto";
import { ShopifyClient } from "@/lib/shopify/client";
import { transformAllData } from "@/lib/shopify/transform";
import type { ShopifyCredentials, ShopifyConnectionConfig } from "@/lib/shopify/types";

/*POST /api/connections/shopify/sync
 * manual sync: fetch Shopify data and return a DataSet for the report wizard.*/
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
    const parsed = syncRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", code: "INVALID_INPUT", details: parsed.error.issues },
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

    const credentials = connection.credentials as ShopifyCredentials;
    const config = connection.config as ShopifyConnectionConfig;
    const accessToken = decrypt(credentials.accessToken);

    const client = new ShopifyClient(config.shop, accessToken);

    const [orders, products, customers] = await Promise.all([
      client.fetchOrders({
        created_at_min: startDate,
        created_at_max: endDate,
      }),
      client.fetchProducts(),
      client.fetchCustomers(),
    ]);

    const dataSet = transformAllData(orders, products, customers, config.shop);

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
