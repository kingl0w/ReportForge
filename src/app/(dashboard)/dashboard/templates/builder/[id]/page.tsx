"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import TemplateCanvas from "@/components/builder/TemplateCanvas";
import type { CustomTemplateConfig } from "@/types/builder";

interface TemplateData {
  id: string;
  name: string;
  description: string;
  config: CustomTemplateConfig;
}

export default function EditTemplatePage() {
  const params = useParams<{ id: string }>();
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/templates/${params.id}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to load template");
        }
        const { template: t } = await res.json();
        setTemplate({
          id: t.id,
          name: t.name,
          description: t.description ?? "",
          config: t.config as CustomTemplateConfig,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2">
        <p className="text-sm text-destructive">{error ?? "Template not found"}</p>
      </div>
    );
  }

  return (
    <TemplateCanvas
      templateId={template.id}
      initialData={{
        name: template.name,
        description: template.description,
        config: template.config,
      }}
    />
  );
}
