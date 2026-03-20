"use client";

import { Check, Loader2, ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { PLANS } from "@/lib/stripe/plans";

export default function UpgradePage() {
  const { plan: rawPlan, isPro, isLoading, upgrade, openPortal } = useSubscription();
  //DB uses "PAY_PER_REPORT" while PlanId type uses "PER_REPORT"
  const plan = rawPlan as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Upgrade your plan
          </h1>
          <p className="text-muted-foreground">
            Choose the plan that fits your needs
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3">
        <PlanCard
          name={PLANS.FREE.name}
          price="$0"
          priceSuffix=""
          features={PLANS.FREE.features}
          isCurrent={plan === "FREE"}
          highlight={false}
          checkColor="text-muted-foreground"
        />

        <PlanCard
          name={PLANS.PER_REPORT.name}
          price="$2.99"
          priceSuffix="/report"
          features={PLANS.PER_REPORT.features}
          isCurrent={plan === "PAY_PER_REPORT"}
          highlight={false}
          checkColor="text-primary"
          action={
            isPro ? (
              <div className="flex h-10 w-full items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
                Included in Pro
              </div>
            ) : plan === "PAY_PER_REPORT" ? (
              <Button
                onClick={() => upgrade("PER_REPORT")}
                disabled={isLoading}
                className="h-10 w-full rounded-lg border border-border bg-secondary text-sm font-semibold text-foreground shadow-none hover:border-primary hover:bg-accent hover:text-foreground"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buy Another Report"
                )}
              </Button>
            ) : (
              <Button
                onClick={() => upgrade("PER_REPORT")}
                disabled={isLoading}
                className="h-10 w-full rounded-lg border border-border bg-secondary text-sm font-semibold text-foreground shadow-none hover:border-primary hover:bg-accent hover:text-foreground"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buy a Report"
                )}
              </Button>
            )
          }
        />

        <PlanCard
          name={PLANS.PRO.name}
          price="$10"
          priceSuffix="/month"
          features={PLANS.PRO.features}
          isCurrent={isPro}
          highlight
          checkColor="text-primary"
          badge="Most Popular"
          action={
            isPro ? (
              <Button
                onClick={openPortal}
                disabled={isLoading}
                className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-none hover:bg-primary/90 hover:text-primary-foreground"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Billing
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => upgrade("PRO")}
                disabled={isLoading}
                className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-none hover:bg-primary/90 hover:text-primary-foreground"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Upgrade to Pro"
                )}
              </Button>
            )
          }
        />
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  priceSuffix,
  features,
  isCurrent,
  highlight,
  checkColor,
  badge,
  action,
}: {
  name: string;
  price: string;
  priceSuffix: string;
  features: string[];
  isCurrent: boolean;
  highlight: boolean;
  checkColor: string;
  badge?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 ${
        highlight
          ? "border-primary/50 bg-card shadow-lg shadow-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card"
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
            {badge}
          </span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="inline-flex items-center rounded-full border border-primary/50 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
            Current Plan
          </span>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-foreground">{name}</h3>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">{price}</span>
          {priceSuffix && (
            <span className="text-base text-muted-foreground">
              {priceSuffix}
            </span>
          )}
        </div>
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${checkColor}`} />
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {action ?? (
          <div className="flex h-10 w-full items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
            {isCurrent ? "Current Plan" : "Free Tier"}
          </div>
        )}
      </div>
    </div>
  );
}
