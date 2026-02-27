import { PageSkeleton, CardSkeleton } from "@/components/shared/LoadingStates";

export default function ConnectionsLoading() {
  return (
    <div className="space-y-6">
      <PageSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
