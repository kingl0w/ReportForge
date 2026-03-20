import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New Report" };

const ReportWizard = dynamic(
  () => import("@/components/reports/ReportWizard"),
  {
    loading: () => (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <Skeleton className="mt-4 h-5 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardContent>
      </Card>
    ),
  }
);

export default function NewReportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Create New Report
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload your data and generate a professional report in seconds.
        </p>
      </div>
      <ReportWizard />
    </div>
  );
}
