import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function NewReportLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="flex items-center justify-center gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="hidden h-4 w-16 sm:block" />
            {i < 3 && <Skeleton className="h-px w-8" />}
          </div>
        ))}
      </div>

      <Card className="bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <Skeleton className="mt-4 h-5 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
            <Skeleton className="mt-6 h-10 w-36" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
