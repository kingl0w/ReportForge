"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Download,
  Trash2,
  MoreHorizontal,
  FilePlus,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ReportRow } from "./page";

const TEMPLATE_LABELS: Record<string, string> = {
  "sales-report": "Sales Report",
  "social-media": "Social Media",
  "crypto-wallet": "Crypto Wallet",
  ecommerce: "E-commerce",
  analytics: "Analytics",
  financial: "Financial",
  custom: "Custom",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  COMPLETE: "default",
  PROCESSING: "secondary",
  QUEUED: "secondary",
  ANALYZING: "secondary",
  GENERATING: "secondary",
  FAILED: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETE: "Complete",
  PROCESSING: "Processing",
  QUEUED: "Queued",
  ANALYZING: "Analyzing",
  GENERATING: "Generating",
  FAILED: "Failed",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

interface ReportsListProps {
  reports: ReportRow[];
}

export default function ReportsList({ reports }: ReportsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch =
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.templateId ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, search, statusFilter]);

  const deletingRef = useRef<string | null>(null);

  const handleDelete = useCallback(
    async (id: string) => {
      if (deletingRef.current) return;
      deletingRef.current = id;
      setDeletingId(id);
      try {
        const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Delete failed");
        }
        toast.success("Report deleted");
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Delete failed";
        toast.error(msg);
      } finally {
        deletingRef.current = null;
        setDeletingId(null);
      }
    },
    [router]
  );

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setPendingDeleteId(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (pendingDeleteId) {
      handleDelete(pendingDeleteId);
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, handleDelete]);

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No reports yet
          </h3>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Upload a CSV, Excel, or JSON file to generate your first report.
          </p>
          <Button
            asChild
            className="mt-6 bg-primary text-foreground font-medium hover:bg-primary/90"
          >
            <Link href="/dashboard/reports/new">
              <FilePlus className="mr-2 h-4 w-4" />
              Create your first report
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Reports</h1>
          <p className="text-muted-foreground">
            {reports.length} report{reports.length !== 1 && "s"} total
          </p>
        </div>
        <Button
          asChild
          className="bg-primary text-foreground font-medium hover:bg-primary/90"
        >
          <Link href="/dashboard/reports/new">
            <FilePlus className="mr-2 h-4 w-4" />
            New Report
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-secondary border border-border text-foreground hover:bg-accent"
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  {statusFilter === "all"
                    ? "All Statuses"
                    : STATUS_LABEL[statusFilter] ?? statusFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  All Statuses
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setStatusFilter("COMPLETE")}
                >
                  Complete
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("PROCESSING")}
                >
                  Processing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("FAILED")}>
                  Failed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No reports match your search.
            </p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Title</TableHead>
                <TableHead className="hidden text-muted-foreground sm:table-cell">
                  Template
                </TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="hidden text-muted-foreground md:table-cell">
                  Format
                </TableHead>
                <TableHead className="hidden text-muted-foreground lg:table-cell">
                  Created
                </TableHead>
                <TableHead className="hidden text-muted-foreground lg:table-cell">
                  Size
                </TableHead>
                <TableHead className="w-12 text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((report) => (
                <TableRow
                  key={report.id}
                  className="border-border hover:bg-accent/50"
                >
                  <TableCell>
                    {report.status === "COMPLETE" ? (
                      <Link
                        href={`/report/${report.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {report.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">
                        {report.title}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {TEMPLATE_LABELS[report.templateId ?? ""] ??
                      report.templateId ??
                      "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_VARIANT[report.status] ?? "secondary"}
                    >
                      {STATUS_LABEL[report.status] ?? report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {report.format}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {formatDate(report.createdAt)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {formatSize(report.fileSize)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {report.status === "COMPLETE" && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/report/${report.id}`}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Report
                              </Link>
                            </DropdownMenuItem>
                            {report.fileUrl && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={report.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  {report.docxUrl ? "Download PDF" : `Download ${report.format === "DOCX" ? "DOCX" : "PDF"}`}
                                </a>
                              </DropdownMenuItem>
                            )}
                            {report.docxUrl && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={report.docxUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download DOCX
                                </a>
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={deletingId === report.id}
                          onClick={() => setPendingDeleteId(report.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === report.id
                            ? "Deleting..."
                            : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={handleAlertOpenChange}
      >
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete report?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the report and its generated files.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-accent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
