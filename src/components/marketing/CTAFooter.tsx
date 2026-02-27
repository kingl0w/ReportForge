"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "./fade-in";

export default function CTAFooter() {
  return (
    <section className="relative overflow-hidden bg-slate-950 py-24 sm:py-32">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[600px] rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <FadeIn>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ready to stop making reports by hand?
          </h2>
        </FadeIn>

        <FadeIn delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Join thousands of analysts, freelancers, and teams who generate
            professional reports in seconds instead of hours. Start free — no
            credit card required.
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              View Pricing
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="mt-6 text-sm text-slate-600">
            Free tier includes 1 report. No credit card required.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
