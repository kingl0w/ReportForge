import { render } from "@react-email/components";
import { getResendClient, getFromEmail } from "./client";
import { ReportReadyEmail } from "./templates/report-ready";
import { WeeklyDigestEmail } from "./templates/weekly-digest";
import { PaymentFailedEmail } from "./templates/payment-failed";
import { WelcomeEmail } from "./templates/welcome";
import { SubscriptionConfirmedEmail } from "./templates/subscription-confirmed";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface KeyMetric {
  label: string;
  value: string;
}

interface SendReportReadyParams {
  to: string;
  reportName: string;
  downloadUrl: string;
  keyMetrics: KeyMetric[];
  userName?: string;
  generatedAt?: Date;
  showBranding?: boolean;
}

/**never throws -- emails are non-critical*/
export async function sendReportReady(params: SendReportReadyParams): Promise<void> {
  try {
    const resend = getResendClient();

    const generatedAtStr = (params.generatedAt ?? new Date()).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const html = await render(
      ReportReadyEmail({
        userName: params.userName ?? "there",
        reportName: params.reportName,
        generatedAt: generatedAtStr,
        downloadUrl: params.downloadUrl,
        keyMetrics: params.keyMetrics,
        dashboardUrl: `${appUrl()}/dashboard`,
        showBranding: params.showBranding ?? true,
      })
    );

    await resend.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: `Your report "${params.reportName}" is ready`,
      html,
    });
  } catch (error) {
    console.error("[email] Failed to send report-ready email:", error);
  }
}

interface DigestReport {
  name: string;
  date: string;
  downloadUrl: string;
}

interface SendWeeklyDigestParams {
  to: string;
  reports: DigestReport[];
  totalGenerated: number;
  topInsight: string;
  userName?: string;
  weekRange?: string;
}

/**never throws -- emails are non-critical*/
export async function sendWeeklyDigest(params: SendWeeklyDigestParams): Promise<void> {
  try {
    const resend = getResendClient();

    const html = await render(
      WeeklyDigestEmail({
        userName: params.userName ?? "there",
        reports: params.reports,
        totalGenerated: params.totalGenerated,
        topInsight: params.topInsight,
        weekRange: params.weekRange ?? "",
        dashboardUrl: `${appUrl()}/dashboard`,
      })
    );

    await resend.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: `Your Weekly Report Digest — ${params.totalGenerated} report${params.totalGenerated === 1 ? "" : "s"} this week`,
      html,
    });
  } catch (error) {
    console.error("[email] Failed to send weekly digest email:", error);
  }
}

interface SendPaymentFailedParams {
  to: string;
  nextRetryDate: string;
  userName?: string;
}

/**never throws -- emails are non-critical*/
export async function sendPaymentFailed(params: SendPaymentFailedParams): Promise<void> {
  try {
    const resend = getResendClient();

    const html = await render(
      PaymentFailedEmail({
        userName: params.userName ?? "there",
        nextRetryDate: params.nextRetryDate,
        updatePaymentUrl: `${appUrl()}/settings`,
        supportEmail: "support@reportforge.com",
      })
    );

    await resend.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: "Action needed: your payment could not be processed",
      html,
    });
  } catch (error) {
    console.error("[email] Failed to send payment-failed email:", error);
  }
}

interface SendWelcomeParams {
  to: string;
  userName: string;
}

/**never throws -- emails are non-critical*/
export async function sendWelcome(params: SendWelcomeParams): Promise<void> {
  try {
    const resend = getResendClient();

    const html = await render(
      WelcomeEmail({
        userName: params.userName,
        uploadUrl: `${appUrl()}/reports/new`,
        templatesUrl: `${appUrl()}/templates`,
        dashboardUrl: `${appUrl()}/dashboard`,
      })
    );

    await resend.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: "Welcome to ReportForge — let's build your first report",
      html,
    });
  } catch (error) {
    console.error("[email] Failed to send welcome email:", error);
  }
}

interface SendSubscriptionConfirmedParams {
  to: string;
  planName: string;
  userName?: string;
}

/**never throws -- emails are non-critical*/
export async function sendSubscriptionConfirmed(params: SendSubscriptionConfirmedParams): Promise<void> {
  try {
    const resend = getResendClient();

    const html = await render(
      SubscriptionConfirmedEmail({
        userName: params.userName ?? "there",
        planName: params.planName,
        dashboardUrl: `${appUrl()}/dashboard`,
      })
    );

    await resend.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: `Your ${params.planName} subscription is now active`,
      html,
    });
  } catch (error) {
    console.error("[email] Failed to send subscription-confirmed email:", error);
  }
}
