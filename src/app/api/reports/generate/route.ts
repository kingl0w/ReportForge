import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReport, generateReportFromDataSet } from "@/lib/reports/generator";
import { createRateLimiter } from "@/lib/rate-limit";
import { decrypt } from "@/lib/crypto";
import { ShopifyClient } from "@/lib/shopify/client";
import { transformAllData as transformShopifyData } from "@/lib/shopify/transform";
import { EbayClient } from "@/lib/ebay/client";
import { transformAllData as transformEbayData } from "@/lib/ebay/transform";
import { sendReportReady } from "@/lib/email/resend";
import type { ShopifyCredentials, ShopifyConnectionConfig } from "@/lib/shopify/types";
import type { EbayCredentials, EbayConnectionConfig } from "@/lib/ebay/types";
import type { ReportConfig, TemplateId } from "@/types/template";
import type { BrandingConfig } from "@/types/settings";
import { getPlanLimits } from "@/lib/stripe/plans";
import { logActivity, getClientIp } from "@/lib/logging/activity";

const limiter = createRateLimiter({
  windowMs: 3_600_000,
  maxRequests: 10,
  message: "Too many report generation requests. Max 10 reports per hour.",
});

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const brandingSchema = z.object({
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(HEX_COLOR).optional(),
  secondaryColor: z.string().regex(HEX_COLOR).optional(),
  accentColor: z.string().regex(HEX_COLOR).optional(),
  footerText: z.string().max(200).optional(),
  showReportForgeBranding: z.boolean().optional(),
});

const generateRequestSchema = z.object({
  title: z.string().min(1).max(200),
  rawDataUrl: z.string().url().optional(),
  fileName: z.string().min(1).optional(),
  connectionId: z.string().uuid().optional(),
  templateId: z.string().optional(),
  format: z.enum(["pdf", "docx", "both"]).optional(),
  brandColor: z
    .string()
    .regex(HEX_COLOR)
    .optional(),
  branding: brandingSchema.optional(),
});

/**
 * POST /api/reports/generate
 *
 * Creates a report record, validates the user's quota, and kicks off generation.
 * Returns the report ID immediately for status polling.
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

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Please verify your email before generating reports.", code: "EMAIL_NOT_VERIFIED" },
        { status: 403 }
      );
    }

    const rl = await limiter.checkAsync(user.id);
    if (!rl.allowed) {
      logActivity({
        action: "ratelimit.hit",
        userId: user.id,
        ip: getClientIp(request),
        metadata: { route: "/api/reports/generate" },
      });
      return NextResponse.json(
        { error: rl.message, code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = generateRequestSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[generate] Validation failed:", parsed.error.issues);
      return NextResponse.json(
        {
          error: "Invalid request",
          code: "INVALID_INPUT",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { title, rawDataUrl, fileName, connectionId, templateId, format, brandColor, branding: requestBranding } =
      parsed.data;

    if (!connectionId && (!rawDataUrl || !fileName)) {
      return NextResponse.json(
        { error: "Provide either connectionId or rawDataUrl + fileName", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    //bypasses RLS so we can check quota across plans
    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin
      .from("User")
      .select("id, plan, reportsUsed, reportsLimit")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      console.error("[generate] User query failed:", userError);
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    //for Pro users, check subscription status and reset counter if new billing period
    if (userData.plan === "PRO") {
      const { data: subData } = await admin
        .from("Subscription")
        .select("currentPeriodStart, status")
        .eq("userId", user.id)
        .single();

      //block generation for unhealthy subscription states
      if (subData?.status === "PAST_DUE") {
        return NextResponse.json(
          {
            error: "Your payment failed. Please update your payment method in billing settings to continue generating reports.",
            code: "PAYMENT_PAST_DUE",
          },
          { status: 403 }
        );
      }
      if (subData?.status === "PAUSED" || subData?.status === "CANCELED") {
        return NextResponse.json(
          {
            error: "Your subscription is no longer active. Please resubscribe to generate reports.",
            code: "SUBSCRIPTION_INACTIVE",
          },
          { status: 403 }
        );
      }

      if (userData.reportsUsed > 0 && subData?.currentPeriodStart) {
        const periodStart = new Date(subData.currentPeriodStart);
        //count reports created in the current billing period
        const { count } = await admin
          .from("Report")
          .select("id", { count: "exact", head: true })
          .eq("userId", user.id)
          .gte("createdAt", periodStart.toISOString());

        const currentPeriodUsage = count ?? 0;
        //sync reportsUsed to actual usage in current period
        if (currentPeriodUsage !== userData.reportsUsed) {
          await admin
            .from("User")
            .update({ reportsUsed: currentPeriodUsage })
            .eq("id", user.id);
          userData.reportsUsed = currentPeriodUsage;
        }
      }
    }

    //all plans are subject to their limit
    if (userData.reportsUsed >= userData.reportsLimit) {
      const messages: Record<string, string> = {
        FREE: "Free report limit reached. Purchase a report or upgrade to Pro for 100 reports/month.",
        PAY_PER_REPORT: "No reports remaining. Purchase another report or upgrade to Pro for 100 reports/month.",
        PRO: "Monthly report limit reached (100/month). Your limit resets at the start of your next billing period.",
      };
      return NextResponse.json(
        {
          error: messages[userData.plan] ?? messages.FREE,
          code: "QUOTA_EXCEEDED",
          remaining: 0,
          plan: userData.plan,
        },
        { status: 403 }
      );
    }

    //enforce plan-based format restrictions
    const planLimits = getPlanLimits(userData.plan);
    const requestedFormat = (format ?? "pdf").toUpperCase();
    const allowedFormats = planLimits.formats;
    if (!allowedFormats.includes(requestedFormat as "PDF" | "DOCX" | "BOTH")) {
      return NextResponse.json(
        {
          error: `${requestedFormat} export is not available on the ${userData.plan === "FREE" ? "Free" : userData.plan} plan. Upgrade to access this format.`,
          code: "FORMAT_NOT_ALLOWED",
          allowedFormats,
          plan: userData.plan,
        },
        { status: 403 }
      );
    }

    //defensive: UserSettings table may not exist if migrations haven't been run
    interface UserSettingsRow {
      emailOnReportComplete?: boolean;
      logoUrl?: string | null;
      brandPrimary?: string | null;
      brandSecondary?: string | null;
      brandAccent?: string | null;
      customFooterText?: string | null;
      removeReportForgeBranding?: boolean;
      [key: string]: unknown;
    }
    let userSettings: UserSettingsRow | null = null;
    try {
      const { data } = await admin
        .from("UserSettings")
        .select("*")
        .eq("userId", user.id)
        .single();
      userSettings = data as UserSettingsRow | null;
    } catch (settingsErr) {
      console.warn("[generate] UserSettings query failed (table may not exist):", settingsErr);
    }

    //request body overrides > saved settings > defaults
    let branding: BrandingConfig | undefined;
    if (userData.plan === "PRO" && (userSettings || requestBranding)) {
      branding = {
        logoUrl: requestBranding?.logoUrl ?? userSettings?.logoUrl ?? null,
        primaryColor: requestBranding?.primaryColor ?? userSettings?.brandPrimary ?? brandColor ?? "#1e3a5f",
        secondaryColor: requestBranding?.secondaryColor ?? userSettings?.brandSecondary ?? "#2d5a8e",
        accentColor: requestBranding?.accentColor ?? userSettings?.brandAccent ?? "#e8913a",
        footerText: requestBranding?.footerText ?? userSettings?.customFooterText ?? null,
        showReportForgeBranding: requestBranding?.showReportForgeBranding ?? !(userSettings?.removeReportForgeBranding),
      };
    }

    let dataSourceType: string;
    let connectionProvider: string | undefined;
    if (connectionId) {
      const { data: connData } = await admin
        .from("DataConnection")
        .select("provider")
        .eq("id", connectionId)
        .eq("userId", user.id)
        .single();
      connectionProvider = (connData?.provider as string | undefined) ?? "SHOPIFY";
      dataSourceType = connectionProvider;
    } else {
      const ext = fileName!.split(".").pop()?.toLowerCase() ?? "";
      const dataSourceMap: Record<string, string> = {
        csv: "CSV",
        xlsx: "EXCEL",
        xls: "EXCEL",
        json: "JSON",
      };
      dataSourceType = dataSourceMap[ext] ?? "CSV";
    }

    const reportId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error: insertError } = await admin.from("Report").insert({
      id: reportId,
      userId: user.id,
      title,
      status: "QUEUED",
      templateId: templateId ?? null,
      format: (format ?? "pdf").toUpperCase(),
      dataSourceType,
      rawDataUrl: rawDataUrl ?? null,
      updatedAt: now,
    });

    if (insertError) {
      console.error("[generate] Report insert failed:", insertError);
      return NextResponse.json(
        { error: "Failed to create report", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    //fire-and-forget — generation runs in background
    if (connectionId) {
      runConnectionGeneration(
        { userId: user.id, reportId, title, connectionId, connectionProvider, templateId, format, brandColor, branding },
        admin,
        userSettings
      ).catch((err) => {
        console.error("[generate] Unhandled connection generation error:", err);
      });
    } else {
      const reportConfig: ReportConfig = {
        userId: user.id,
        reportId,
        title,
        rawDataUrl: rawDataUrl!,
        fileName: fileName!,
        templateId: (templateId as TemplateId) ?? null,
        format: format ?? "pdf",
        brandColor,
        branding,
        planRowLimit: planLimits.maxRows,
        watermark: planLimits.watermark,
      };

      runGeneration(reportConfig, admin, userSettings).catch((err) => {
        console.error("[generate] Unhandled file generation error:", err);
      });
    }

    await admin
      .from("User")
      .update({ reportsUsed: userData.reportsUsed + 1 })
      .eq("id", user.id);

    logActivity({
      action: "report.generate",
      userId: user.id,
      ip: getClientIp(request),
      metadata: { reportId, templateId: templateId ?? null, format: format ?? "pdf", dataSourceType },
    });

    return NextResponse.json({
      reportId,
      status: "QUEUED",
    });
  } catch (error: unknown) {
    console.error("[generate] Report generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate report";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 *run the full generation pipeline, updating status at each step.
 */
async function runGeneration(
  config: ReportConfig,
  admin: ReturnType<typeof createAdminClient>,
  userSettings?: Record<string, unknown> | null
) {
  try {
    await admin
      .from("Report")
      .update({ status: "PROCESSING", updatedAt: new Date().toISOString() })
      .eq("id", config.reportId);

    const result = await generateReport(config, async (event) => {
      //map pipeline status to DB enum values
      const statusMap: Record<string, string> = {
        PARSING: "PROCESSING",
        ANALYZING: "ANALYZING",
        GENERATING_CHARTS: "GENERATING",
        WRITING_NARRATIVE: "GENERATING",
        RENDERING: "GENERATING",
        UPLOADING: "GENERATING",
      };
      const dbStatus = statusMap[event.status] ?? "PROCESSING";
      await admin
        .from("Report")
        .update({
          status: dbStatus,
          updatedAt: new Date().toISOString(),
          metadata: {
            step: event.step,
            totalSteps: event.totalSteps,
            message: event.message,
          },
        })
        .eq("id", config.reportId);
    });

    //store analysis + narrative for interactive dashboard
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
          step: 6,
          totalSteps: 6,
          message: "Report complete",
          templateId: result.templateId,
          format: result.format,
          previewUrl: result.previewUrl,
          analysis: result.analysis,
          narrative: result.narrative,
        },
      })
      .eq("id", config.reportId);

    logActivity({
      action: "report.complete",
      userId: config.userId,
      metadata: {
        reportId: config.reportId,
        templateId: result.templateId,
        format: result.format,
        durationMs: Date.now() - result.generatedAt.getTime(),
      },
    });

    if (userSettings?.emailOnReportComplete !== false) {
      try {
        const { data: userData } = await admin
          .from("User")
          .select("name, email")
          .eq("id", config.userId)
          .single();

        if (userData?.email) {
          const metrics = result.analysis?.metrics ?? [];
          const keyMetrics = metrics.slice(0, 5).map((m) => ({
            label: m.name,
            value: m.formattedValue ?? String(m.value),
          }));

          await sendReportReady({
            to: userData.email,
            reportName: config.title,
            downloadUrl: result.fileUrl,
            keyMetrics,
            userName: userData.name ?? "there",
            generatedAt: result.generatedAt,
            showBranding: config.branding?.showReportForgeBranding ?? true,
          });
        }
      } catch {
        //email failure never affects report status
      }
    }
  } catch (error: unknown) {
    console.error("[generate] runGeneration failed for report", config.reportId, error);
    const message =
      error instanceof Error ? error.message : "Generation failed";
    await admin
      .from("Report")
      .update({
        status: "FAILED",
        errorMessage: message,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", config.reportId);
  }
}

/**
 *run generation from a connection (Shopify or eBay) — fetches API data, then runs the pipeline.
 */
async function runConnectionGeneration(
  params: {
    userId: string;
    reportId: string;
    title: string;
    connectionId: string;
    connectionProvider?: string | null;
    templateId?: string;
    format?: string;
    brandColor?: string;
    branding?: BrandingConfig;
  },
  admin: ReturnType<typeof createAdminClient>,
  userSettings?: Record<string, unknown> | null
) {
  try {
    await admin
      .from("Report")
      .update({ status: "PROCESSING", updatedAt: new Date().toISOString() })
      .eq("id", params.reportId);

    const { data: connection, error: connError } = await admin
      .from("DataConnection")
      .select("*")
      .eq("id", params.connectionId)
      .eq("userId", params.userId)
      .eq("isActive", true)
      .single();

    if (connError || !connection) {
      throw new Error("Connection not found or inactive");
    }

    const provider = params.connectionProvider ?? connection.provider;
    let dataSet;
    let defaultTemplateId: string;

    if (provider === "EBAY") {
      const credentials = connection.credentials as EbayCredentials;
      const config = connection.config as EbayConnectionConfig;
      const client = EbayClient.fromEncrypted(
        credentials,
        params.connectionId,
        config.marketplace
      );

      const { orders, transactions } = await client.fetchSalesOverview();
      const storeName = config.username ?? "eBay";
      dataSet = transformEbayData(orders, transactions, storeName);
      defaultTemplateId = "ebay-sales";
    } else {
      const credentials = connection.credentials as ShopifyCredentials;
      const config = connection.config as ShopifyConnectionConfig;
      const accessToken = decrypt(credentials.accessToken);

      const client = new ShopifyClient(config.shop, accessToken);
      const [orders, products, customers] = await Promise.all([
        client.fetchOrders(),
        client.fetchProducts(),
        client.fetchCustomers(),
      ]);

      dataSet = transformShopifyData(orders, products, customers, config.shop);
      defaultTemplateId = "shopify-sales";
    }

    const resolvedTemplateId = params.templateId ?? defaultTemplateId;

    const result = await generateReportFromDataSet(dataSet, {
      userId: params.userId,
      reportId: params.reportId,
      title: params.title,
      templateId: resolvedTemplateId as TemplateId,
      format: (params.format as "pdf" | "docx" | "both") ?? "pdf",
      brandColor: params.brandColor,
      branding: params.branding,
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
          step: 6,
          totalSteps: 6,
          message: "Report complete",
          templateId: result.templateId,
          format: result.format,
          previewUrl: result.previewUrl,
          analysis: result.analysis,
          narrative: result.narrative,
        },
      })
      .eq("id", params.reportId);

    await admin
      .from("DataConnection")
      .update({ lastSyncAt: new Date().toISOString() })
      .eq("id", params.connectionId);

    logActivity({
      action: "report.complete",
      userId: params.userId,
      metadata: {
        reportId: params.reportId,
        templateId: result.templateId,
        format: result.format,
        connectionProvider: params.connectionProvider,
      },
    });

    if (userSettings?.emailOnReportComplete !== false) {
      try {
        const { data: userData } = await admin
          .from("User")
          .select("name, email")
          .eq("id", params.userId)
          .single();

        if (userData?.email) {
          const metrics = result.analysis?.metrics ?? [];
          const keyMetrics = metrics.slice(0, 5).map((m) => ({
            label: m.name,
            value: m.formattedValue ?? String(m.value),
          }));

          await sendReportReady({
            to: userData.email,
            reportName: params.title,
            downloadUrl: result.fileUrl,
            keyMetrics,
            userName: userData.name ?? "there",
            generatedAt: result.generatedAt,
            showBranding: params.branding?.showReportForgeBranding ?? true,
          });
        }
      } catch {
        //email failure never affects report status
      }
    }
  } catch (error: unknown) {
    console.error("[generate] runConnectionGeneration failed for report", params.reportId, error);
    const message =
      error instanceof Error ? error.message : "Generation failed";
    await admin
      .from("Report")
      .update({
        status: "FAILED",
        errorMessage: message,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", params.reportId);
  }
}
