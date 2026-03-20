"use client";

import { Check, Loader2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLANS } from "@/lib/stripe/plans";
import type { useSubscription } from "@/hooks/useSubscription";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: ReturnType<typeof useSubscription>;
}

export default function UpgradeModal({
  open,
  onOpenChange,
  subscription,
}: UpgradeModalProps) {
  const { reportsUsed, reportsLimit, isLoading, upgrade } = subscription;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Report Limit Reached
          </DialogTitle>
          <DialogDescription>
            You&apos;ve used all {reportsLimit} of your free reports ({reportsUsed}/{reportsLimit}).
            Choose an option below to continue generating reports.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Buy a Single Report
                </p>
                <p className="text-xs text-muted-foreground">
                  ${PLANS.PER_REPORT.price} one-time
                </p>
              </div>
              <Button
                size="sm"
                className="bg-secondary border border-border text-foreground hover:bg-accent"
                onClick={() => upgrade("PER_REPORT")}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buy Report"
                )}
              </Button>
            </div>
            <ul className="mt-3 space-y-1.5">
              {PLANS.PER_REPORT.features.slice(0, 3).map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Upgrade to Pro
                </p>
                <p className="text-xs text-muted-foreground">
                  ${PLANS.PRO.price}/month &mdash; unlimited reports
                </p>
              </div>
              <Button
                size="sm"
                className="bg-primary text-foreground font-medium hover:bg-primary/90"
                onClick={() => upgrade("PRO")}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Go Pro"
                )}
              </Button>
            </div>
            <ul className="mt-3 space-y-1.5">
              {PLANS.PRO.features.slice(0, 4).map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
