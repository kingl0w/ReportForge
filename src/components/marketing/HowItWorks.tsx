"use client";

import { Upload, Sparkles, FileDown } from "lucide-react";
import { FadeIn } from "./fade-in";

interface Step {
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Your Data",
    description:
      "Drop in a CSV, Excel file, or connect your Shopify or Google Analytics account.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "AI Analyzes Everything",
    description:
      "Our engine detects trends, anomalies, and insights — then picks the perfect template.",
  },
  {
    number: "03",
    icon: FileDown,
    title: "Download Your Report",
    description:
      "Get a polished PDF or DOCX with charts, summaries, and executive insights.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-muted/50 py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three steps to professional reports
            </p>
          </div>
        </FadeIn>

        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-0">
          {steps.map((step, index) => (
            <FadeIn key={step.number} delay={index * 0.1}>
              <div className="relative flex flex-col items-center text-center">
                {index < steps.length - 1 && (
                  <div
                    className="absolute top-16 left-[calc(50%+60px)] hidden h-0 w-[calc(100%-120px)] border-t-2 border-dashed border-border md:block"
                    aria-hidden="true"
                  />
                )}

                <div className="w-full rounded-xl border border-border bg-card p-8">
                  <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Step {step.number}
                  </span>

                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>

                  <h3 className="mb-3 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
