import { redirect } from "next/navigation";

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

/*redirect dashboard report detail to the interactive report page.*/
export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { id } = await params;
  redirect(`/report/${id}`);
}
