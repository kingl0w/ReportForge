import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { ShopifyClient } from "@/lib/shopify/client";
import { transformAllData } from "@/lib/shopify/transform";
import { generateReportFromDataSet } from "@/lib/reports/generator";
import { sendReportReady } from "@/lib/email/resend";
import type { ShopifyCredentials, ShopifyConnectionConfig } from "@/lib/shopify/types";
import type { TemplateId } from "@/types/template";
import type { BrandingConfig } from "@/types/settings";

/*GET /api/cron/weekly-reports
 * Vercel Cron job — generates weekly reports for all active Shopify connections.
 * schedule: every Monday at 8 AM UTC (configured in vercel.json).*/
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  const results: { connectionId: string; reportId: string | null; error: string | null }[] = [];

  try {
    const { data: connections, error } = await admin
      .from("DataConnection")
      .select("id, userId, credentials, config, shopDomain")
      .eq("provider", "SHOPIFY")
      .eq("isActive", true);

    if (error || !connections) {
      return NextResponse.json(
        { error: "Failed to fetch connections", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    for (const connection of connections) {
      try {
        const credentials = connection.credentials as ShopifyCredentials;
        const config = connection.config as ShopifyConnectionConfig;
        const accessToken = decrypt(credentials.accessToken);

        const client = new ShopifyClient(config.shop, accessToken);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [orders, products, customers] = await Promise.all([
          client.fetchOrders({ created_at_min: sevenDaysAgo.toISOString() }),
          client.fetchProducts(),
          client.fetchCustomers(),
        ]);

        const dataSet = transformAllData(orders, products, customers, config.shop);

        const { data: userSettings } = await admin
          .from("UserSettings")
          .select("*")
          .eq("userId", connection.userId)
          .single();

        const { data: userData } = await admin
          .from("User")
          .select("plan, name, email")
          .eq("id", connection.userId)
          .single();

        let branding: BrandingConfig | undefined;
        if (userData?.plan === "PRO" && userSettings) {
          branding = {
            logoUrl: userSettings.logoUrl ?? null,
            primaryColor: userSettings.brandPrimary ?? "#1e3a5f",
            secondaryColor: userSettings.brandSecondary ?? "#2d5a8e",
            accentColor: userSettings.brandAccent ?? "#e8913a",
            footerText: userSettings.customFooterText ?? null,
            showReportForgeBranding: !userSettings.removeReportForgeBranding,
          };
        }

        const reportId = crypto.randomUUID();
        const weekStr = sevenDaysAgo.toISOString().slice(0, 10);
        const title = `Weekly Shopify Report — ${config.shop} (${weekStr})`;

        await admin.from("Report").insert({
          id: reportId,
          userId: connection.userId,
          title,
          status: "QUEUED",
          format: "PDF",
          dataSourceType: "SHOPIFY",
          updatedAt: new Date().toISOString(),
        });

        const result = await generateReportFromDataSet(dataSet, {
          userId: connection.userId,
          reportId,
          title,
          templateId: "ecommerce" as TemplateId,
          format: "pdf",
          branding,
        });

        await admin
          .from("Report")
          .update({
            status: "COMPLETE",
            fileUrl: result.fileUrl,
            fileSize: result.fileSize,
            pageCount: result.pageCount,
            templateId: result.templateId,
            generatedAt: result.generatedAt.toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
              previewUrl: result.previewUrl,
            },
          })
          .eq("id", reportId);

        await admin
          .from("DataConnection")
          .update({ lastSyncAt: new Date().toISOString() })
          .eq("id", connection.id);

        if (userSettings?.emailOnReportComplete !== false && userData?.email) {
          try {
            await sendReportReady({
              to: userData.email,
              reportName: title,
              downloadUrl: result.fileUrl,
              keyMetrics: [],
              userName: userData.name ?? "there",
              generatedAt: result.generatedAt,
              showBranding: branding?.showReportForgeBranding ?? true,
            });
          } catch {
            //email failure doesn't affect cron results
          }
        }

        results.push({ connectionId: connection.id, reportId, error: null });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({ connectionId: connection.id, reportId: null, error: message });
      }
    }

    const succeeded = results.filter((r) => !r.error).length;
    const failed = results.filter((r) => r.error).length;

    return NextResponse.json({
      processed: connections.length,
      succeeded,
      failed,
      results,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Cron job failed";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
