"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  LayoutTemplate,
  Pencil,
  Trash2,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CustomTemplateConfig } from "@/types/builder";

interface UserTemplateItem {
  id: string;
  name: string;
  description: string | null;
  config: CustomTemplateConfig;
  createdAt: string;
}

export default function UserTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<UserTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/templates/${deleteTarget}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget));
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Templates</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage custom report templates.
          </p>
        </div>
        <Button className="bg-blue-600 text-white font-medium hover:bg-blue-500" asChild>
          <Link href="/dashboard/templates/builder">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 rounded-lg border border-border p-6">
              <Skeleton className="h-1.5 w-full rounded-t" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <Skeleton key={j} className="h-2 flex-1 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <LayoutTemplate className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-foreground">
            No custom templates yet
          </h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Create your first custom template to get started.
          </p>
          <div className="mt-6">
            <Button className="bg-blue-600 text-white font-medium hover:bg-blue-500" asChild>
              <Link href="/dashboard/templates/builder">
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const colors = template.config?.colorScheme?.chartColors ?? [];
            const sectionCount = template.config?.sections?.length ?? 0;

            return (
              <Card key={template.id} className="overflow-hidden">
                <div
                  className="h-1.5"
                  style={{
                    backgroundColor:
                      template.config?.colorScheme?.primary ?? "#374151",
                  }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {template.description ?? "Custom report template"}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10 dark:hover:bg-white/10">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/templates/builder/${template.id}`
                            )
                          }
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(template.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {sectionCount} sections
                    </span>
                  </div>

                  {colors.length > 0 && (
                    <div className="flex gap-1">
                      {colors.slice(0, 6).map((color: string, i: number) => (
                        <div
                          key={i}
                          className="h-2 flex-1 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
                    onClick={() =>
                      router.push(
                        `/dashboard/templates/builder/${template.id}`
                      )
                    }
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Existing reports using this template
              will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
