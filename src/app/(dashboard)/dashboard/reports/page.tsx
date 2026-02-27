import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ReportsList from "./ReportsList";

export const metadata: Metadata = { title: "My Reports | ReportForge" };

export interface ReportRow {
  id: string;
  title: string;
  templateId: string | null;
  status: string;
  format: string;
  fileUrl: string | null;
  docxUrl: string | null;
  fileSize: number | null;
  createdAt: string;
  generatedAt: string | null;
}

export default async function ReportHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const admin = createAdminClient();
  const { data: reports, error } = await admin
    .from("Report")
    .select(
      "id, title, templateId, status, format, fileUrl, docxUrl, fileSize, createdAt, generatedAt"
    )
    .eq("userId", user.id)
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("[reports] Query failed:", error);
  }

  return <ReportsList reports={(reports as ReportRow[]) ?? []} />;
}
