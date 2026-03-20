"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ReportDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-md bg-card text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="mt-4 text-foreground">
            Failed to load report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred."}
          </p>
        </CardContent>
        <CardFooter className="justify-center gap-2">
          <Button className="bg-primary text-foreground font-medium hover:bg-primary/90" onClick={reset}>Try Again</Button>
          <Button className="bg-secondary border border-border text-foreground hover:bg-accent" asChild>
            <Link href="/dashboard/reports">Back to Reports</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
