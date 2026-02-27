import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import InteractiveDashboard from "@/components/reports/InteractiveDashboard";
import { getPlanLimits } from "@/lib/stripe/plans";
import type { AnalysisResult, NarrativeResult } from "@/types/report";
import type { Metadata } from "next";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

interface ReportMetadata {
  analysis?: AnalysisResult;
  narrative?: NarrativeResult;
  templateId?: string;
  previewUrl?: string;
  [key: string]: unknown;
}

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: report } = await admin
    .from("Report")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: report?.title
      ? `${report.title} | ReportForge`
      : "Report | ReportForge",
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: report, error } = await admin
    .from("Report")
    .select(
      "id, userId, title, status, templateId, format, fileUrl, docxUrl, fileSize, pageCount, metadata, generatedAt, createdAt, isPublic"
    )
    .eq("id", id)
    .single();

  if (error || !report) {
    notFound();
  }

  //private reports: the client component handles auth check via API
  if (!report.isPublic) {
  }

  if (report.status !== "COMPLETE") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white">
            Report Not Ready
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            This report is still being generated. Check back shortly.
          </p>
        </div>
      </div>
    );
  }

  //fetch owner plan to determine if charts should be blurred
  const { data: ownerData } = await admin
    .from("User")
    .select("plan")
    .eq("id", report.userId)
    .single();

  const ownerPlan = ownerData?.plan ?? "FREE";
  const blurCharts = !getPlanLimits(ownerPlan).interactiveDashboard;

  const metadata = report.metadata as ReportMetadata | null;
  const analysis = metadata?.analysis ?? null;
  const narrative = metadata?.narrative ?? null;

  if (!analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white">{report.title}</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Interactive view is not available for this report.
          </p>
          {report.fileUrl && (
            <a
              href={report.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <InteractiveDashboard
      reportId={report.id}
      title={report.title}
      templateId={report.templateId}
      analysis={analysis}
      narrative={narrative}
      fileUrl={report.fileUrl}
      docxUrl={report.docxUrl}
      format={report.format}
      generatedAt={report.generatedAt}
      isPublic={report.isPublic}
      blurCharts={blurCharts}
    />
  );
}
