import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  TrendingUp,
  Upload,
  LayoutTemplate,
  ArrowRight,
  Download,
  RotateCcw,
  Plus,
  ArrowUpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface DashboardData {
  userName: string;
  reportsUsed: number;
  reportsLimit: number;
  plan: string;
  recentReports: {
    id: string;
    title: string;
    status: string;
    format: string;
    createdAt: string;
    templateId: string | null;
  }[];
}

async function getDashboardData(): Promise<DashboardData | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();

    const [userResult, reportsResult] = await Promise.all([
      admin
        .from("User")
        .select("plan, reportsUsed, reportsLimit, name")
        .eq("id", user.id)
        .single(),
      admin
        .from("Report")
        .select("id, title, status, format, createdAt, templateId")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false })
        .limit(5),
    ]);

    let userData = userResult.data;

    //auto-create User row if auth user exists but public User row is missing
    if (!userData) {
      const { data: staleRow } = await admin
        .from("User")
        .select("id")
        .eq("email", user.email!)
        .single();

      if (staleRow && staleRow.id !== user.id) {
        const { data: updated } = await admin
          .from("User")
          .update({
            id: user.id,
            name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
            avatarUrl: user.user_metadata?.avatar_url ?? null,
            updatedAt: new Date().toISOString(),
          })
          .eq("email", user.email!)
          .select("plan, reportsUsed, reportsLimit, name")
          .single();
        userData = updated;
      } else {
        const { data: created } = await admin
          .from("User")
          .upsert(
            {
              id: user.id,
              email: user.email!,
              name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
              avatarUrl: user.user_metadata?.avatar_url ?? null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { onConflict: "id" }
          )
          .select("plan, reportsUsed, reportsLimit, name")
          .single();
        userData = created;
      }
    }

    if (!userData) return null;

    let { reportsUsed } = userData;

    //for Pro users, count reports in current billing period
    if (userData.plan === "PRO") {
      const { data: subData } = await admin
        .from("Subscription")
        .select("currentPeriodStart")
        .eq("userId", user.id)
        .single();

      if (subData?.currentPeriodStart) {
        const { count } = await admin
          .from("Report")
          .select("id", { count: "exact", head: true })
          .eq("userId", user.id)
          .gte("createdAt", new Date(subData.currentPeriodStart).toISOString());
        reportsUsed = count ?? 0;
      }
    }

    //resolve display name: DB name > auth metadata > email prefix
    const displayName =
      userData.name ||
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "there";

    return {
      userName: displayName,
      reportsUsed,
      reportsLimit: userData.reportsLimit,
      plan: userData.plan,
      recentReports: reportsResult.data ?? [],
    };
  } catch {
    return null;
  }
}

function getQuickActions(plan: string) {
  const actions = [
    {
      label: "Upload CSV",
      description: "Generate a report from your data",
      icon: Upload,
      href: "/dashboard/reports/new",
    },
  ];

  if (plan !== "PRO") {
    actions.push({
      label: "Upgrade to Pro",
      description: "100 reports/month, all formats",
      icon: ArrowUpCircle,
      href: "/dashboard/upgrade",
    });
  }

  actions.push({
    label: "Browse Templates",
    description: "Explore report templates",
    icon: LayoutTemplate,
    href: "/dashboard/templates",
  });

  return actions;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  COMPLETE: "default",
  PROCESSING: "secondary",
  QUEUED: "secondary",
  ANALYZING: "secondary",
  GENERATING: "secondary",
  FAILED: "destructive",
};

const statusLabel: Record<string, string> = {
  COMPLETE: "Complete",
  PROCESSING: "Processing",
  QUEUED: "Queued",
  ANALYZING: "Analyzing",
  GENERATING: "Generating",
  FAILED: "Failed",
};

function StatsCards({ data }: { data: DashboardData }) {
  const { reportsUsed, reportsLimit, plan } = data;
  const reportsRemaining = Math.max(0, reportsLimit - reportsUsed);
  const usagePercent = reportsLimit > 0 ? Math.min(100, Math.round((reportsUsed / reportsLimit) * 100)) : 0;

  const planLabel = plan === "PRO" ? "Pro" : plan === "PAY_PER_REPORT" ? "Pay per Report" : "Free";
  const periodLabel = plan === "PRO" ? "this month" : "total";
  const showUpgrade = plan !== "PRO";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Reports Used
          </CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {reportsUsed}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              / {reportsLimit}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div
              className={`h-2 rounded-full ${usagePercent >= 90 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {planLabel} plan &middot; {periodLabel}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Reports Remaining
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {reportsRemaining}
          </div>
          <p className="text-xs text-muted-foreground">
            {reportsRemaining === 0
              ? "Limit reached"
              : `${reportsRemaining} report${reportsRemaining !== 1 ? "s" : ""} available`}
          </p>
          {showUpgrade && (
            <Link
              href="/dashboard/upgrade"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
            >
              Upgrade to Pro for 100/month
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Generation Time
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            &mdash;
          </div>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-24" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-20" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div>
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-1 h-3 w-52" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function RecentReportsList({ reports }: { reports: DashboardData["recentReports"] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Recent Reports</CardTitle>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent" asChild>
          <Link href="/dashboard/reports">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              No reports yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload a CSV or connect a data source to generate your first report.
            </p>
            <Button asChild size="sm" className="mt-4 bg-primary text-primary-foreground font-medium hover:bg-primary/90">
              <Link href="/dashboard/reports/new">
                <Plus className="mr-2 h-4 w-4" />
                Create your first report
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/dashboard/reports/${report.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {report.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {report.format} &middot; {formatRelativeTime(report.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant[report.status]}>
                    {statusLabel[report.status]}
                  </Badge>
                  {report.status === "COMPLETE" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent" asChild>
                      <span>
                        <Download className="h-4 w-4" />
                      </span>
                    </Button>
                  )}
                  {report.status === "FAILED" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent" asChild>
                      <span>
                        <RotateCcw className="h-4 w-4" />
                      </span>
                    </Button>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function QuickActions({ plan }: { plan: string }) {
  const quickActions = getQuickActions(plan);
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {quickActions.map((action) => (
        <Link key={action.label} href={action.href}>
          <Card className="h-full bg-card transition-colors hover:bg-accent/50">
            <CardContent className="flex items-start gap-3 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {action.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export const metadata: Metadata = { title: "Dashboard" };

async function DashboardContent() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Unable to load dashboard data. Please try refreshing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {data.userName}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your reports.
        </p>
      </div>

      <StatsCards data={data} />

      <RecentReportsList reports={data.recentReports} />

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Quick Actions
        </h2>
        <QuickActions plan={data.plan} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
