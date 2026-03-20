"use client";

import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "./fade-in";
import { useSubscription } from "@/hooks/useSubscription";
import { PLANS } from "@/lib/stripe/plans";

const FREE_FEATURES = PLANS.FREE.features;
const PER_REPORT_FEATURES = PLANS.PER_REPORT.features;
const PRO_FEATURES = PLANS.PRO.features;

interface PricingCardsProps {
  authenticated?: boolean;
}

export default function PricingCards({ authenticated = false }: PricingCardsProps) {
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free with 1 report. No credit card required.
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
          {authenticated ? (
            <AuthenticatedCards />
          ) : (
            <PublicCards />
          )}
        </div>
      </div>
    </section>
  );
}

function PublicCards() {
  return (
    <>
      <FadeIn delay={0.05}>
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-8">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Free</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try it out, no strings attached
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-foreground">$0</span>
            </div>
            <ul className="mt-8 space-y-4">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-8">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">
              Pay Per Report
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Perfect for one-off reports
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-foreground">$2.99</span>
              <span className="text-lg text-muted-foreground">/report</span>
            </div>
            <ul className="mt-8 space-y-4">
              {PER_REPORT_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="relative flex h-full flex-col rounded-xl border-2 border-primary bg-card p-8 shadow-sm">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
              Most Popular
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Pro</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              For teams and power users
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-foreground">$10</span>
              <span className="text-lg text-muted-foreground">/month</span>
            </div>
            <ul className="mt-8 space-y-4">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10">
            <Button className="w-full" asChild>
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </FadeIn>
    </>
  );
}

function AuthenticatedCards() {
  const {
    plan,
    isLoading,
    isPro,
    upgrade,
  } = useSubscription();

  return (
    <>
      <FadeIn delay={0.05}>
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-8">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Free</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try it out, no strings attached
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-foreground">$0</span>
            </div>
            <ul className="mt-8 space-y-4">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10">
            {plan === "FREE" ? (
              <div className="flex h-10 w-full items-center justify-center rounded-lg border border-primary/50 text-sm font-semibold text-primary">
                Current Plan
              </div>
            ) : (
              <div className="flex h-10 w-full items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
                Free Tier
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-8">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">
              Pay Per Report
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Perfect for one-off reports
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-foreground">$2.99</span>
              <span className="text-lg text-muted-foreground">/report</span>
            </div>
            <ul className="mt-8 space-y-4">
              {PER_REPORT_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10">
            <Button
              onClick={() => upgrade("PER_REPORT")}
              disabled={isLoading || isPro}
              className="h-10 w-full rounded-lg border border-border bg-card text-sm font-semibold text-foreground shadow-none hover:bg-accent hover:text-foreground"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPro ? (
                "Included in Pro"
              ) : (
                "Buy a Report"
              )}
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="relative flex h-full flex-col rounded-xl border-2 border-primary bg-card p-8 shadow-sm">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
              Most Popular
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Pro</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              For teams and power users
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-5xl font-bold text-foreground">$10</span>
              <span className="text-lg text-muted-foreground">/month</span>
            </div>
            <ul className="mt-8 space-y-4">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10">
            {isPro ? (
              <div className="flex h-10 w-full items-center justify-center rounded-lg border border-primary/50 bg-primary/5 text-sm font-semibold text-primary">
                Current Plan
              </div>
            ) : (
              <Button
                onClick={() => upgrade("PRO")}
                disabled={isLoading}
                className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-none hover:bg-primary/90 hover:text-primary-foreground"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : plan === "FREE" ? (
                  "Get Started"
                ) : (
                  "Upgrade to Pro"
                )}
              </Button>
            )}
          </div>
        </div>
      </FadeIn>
    </>
  );
}
