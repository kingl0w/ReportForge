import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      <Card className="bg-card">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <div className="p-4">
          <div className="flex items-center gap-4 border-b border-border pb-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="hidden h-4 w-28 sm:block" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="hidden h-4 w-12 md:block" />
            <Skeleton className="hidden h-4 w-24 lg:block" />
            <Skeleton className="hidden h-4 w-16 lg:block" />
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border py-3 last:border-0"
            >
              <Skeleton className="h-4 w-48" />
              <Skeleton className="hidden h-4 w-28 sm:block" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="hidden h-4 w-12 md:block" />
              <Skeleton className="hidden h-4 w-24 lg:block" />
              <Skeleton className="hidden h-4 w-16 lg:block" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
