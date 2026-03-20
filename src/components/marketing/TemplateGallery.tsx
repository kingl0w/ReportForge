"use client";

import { FadeIn } from "./fade-in";

interface Template {
  name: string;
  description: string;
  chartType: string;
  visualization: React.ReactNode;
}


function BarViz() {
  return (
    <div className="flex items-end gap-1 h-24 px-4 pt-4">
      <div className="w-full rounded-t bg-primary/30 h-[35%]" />
      <div className="w-full rounded-t bg-primary/50 h-[60%]" />
      <div className="w-full rounded-t bg-primary/70 h-[85%]" />
      <div className="w-full rounded-t bg-primary h-[70%]" />
      <div className="w-full rounded-t bg-primary/60 h-[50%]" />
      <div className="w-full rounded-t bg-amber-500/50 h-[90%]" />
      <div className="w-full rounded-t bg-amber-500/70 h-[65%]" />
    </div>
  );
}

function AreaViz() {
  return (
    <div className="relative h-24 px-4 pt-4 overflow-hidden">
      <svg
        viewBox="0 0 200 80"
        fill="none"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.47 0.1 200)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="oklch(0.47 0.1 200)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path
          d="M0 60 Q30 50 50 35 T100 25 T150 40 T200 20 V80 H0Z"
          fill="url(#area-grad)"
        />
        <path
          d="M0 60 Q30 50 50 35 T100 25 T150 40 T200 20"
          stroke="oklch(0.47 0.1 200)"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    </div>
  );
}

function DonutViz() {
  return (
    <div className="flex items-center justify-center h-24 pt-4">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="oklch(0.91 0.005 85)"
            strokeWidth="4"
          />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="oklch(0.47 0.1 200)"
            strokeWidth="4"
            strokeDasharray="35 65"
            strokeDashoffset="0"
          />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="oklch(0.62 0.14 60)"
            strokeWidth="4"
            strokeDasharray="25 75"
            strokeDashoffset="-35"
          />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="oklch(0.52 0.10 155)"
            strokeWidth="4"
            strokeDasharray="20 80"
            strokeDashoffset="-60"
          />
        </svg>
      </div>
      <div className="ml-4 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-[10px] text-muted-foreground">BTC</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-[10px] text-muted-foreground">ETH</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-muted-foreground">SOL</span>
        </div>
      </div>
    </div>
  );
}

function TableViz() {
  return (
    <div className="h-24 px-4 pt-4 space-y-1.5">
      <div className="flex gap-2">
        <div className="h-2 w-1/3 rounded bg-muted-foreground/30" />
        <div className="h-2 w-1/4 rounded bg-muted-foreground/30" />
        <div className="h-2 w-1/5 rounded bg-muted-foreground/30" />
      </div>
      <div className="flex gap-2">
        <div className="h-2 w-1/3 rounded bg-primary/20" />
        <div className="h-2 w-1/4 rounded bg-primary/20" />
        <div className="h-2 w-1/5 rounded bg-primary/20" />
      </div>
      <div className="flex gap-2">
        <div className="h-2 w-1/3 rounded bg-primary/10" />
        <div className="h-2 w-1/4 rounded bg-primary/10" />
        <div className="h-2 w-1/5 rounded bg-primary/10" />
      </div>
      <div className="flex gap-2">
        <div className="h-2 w-1/3 rounded bg-primary/20" />
        <div className="h-2 w-1/4 rounded bg-primary/20" />
        <div className="h-2 w-1/5 rounded bg-primary/20" />
      </div>
      <div className="flex gap-2">
        <div className="h-2 w-1/3 rounded bg-primary/10" />
        <div className="h-2 w-1/4 rounded bg-primary/10" />
        <div className="h-2 w-1/5 rounded bg-primary/10" />
      </div>
    </div>
  );
}

function FunnelViz() {
  return (
    <div className="flex flex-col items-center gap-1 h-24 px-4 pt-4">
      <div className="h-3 w-[90%] rounded bg-primary/50" />
      <div className="h-3 w-[70%] rounded bg-primary/40" />
      <div className="h-3 w-[50%] rounded bg-primary/35" />
      <div className="h-3 w-[35%] rounded bg-amber-500/40" />
      <div className="h-3 w-[20%] rounded bg-amber-500/50" />
    </div>
  );
}

function AiViz() {
  return (
    <div className="flex items-center justify-center h-24 pt-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 text-primary"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
            />
          </svg>
        </div>
        <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
      </div>
    </div>
  );
}

const templates: Template[] = [
  {
    name: "Sales Performance",
    description:
      "Revenue trends, top products, and period-over-period comparisons.",
    chartType: "Line + Bar",
    visualization: <BarViz />,
  },
  {
    name: "Social Media Analytics",
    description:
      "Follower growth, engagement rates, and top content analysis.",
    chartType: "Area + Pie",
    visualization: <AreaViz />,
  },
  {
    name: "Crypto Portfolio",
    description:
      "Token allocation, transaction history, and P&L breakdown.",
    chartType: "Donut + Line",
    visualization: <DonutViz />,
  },
  {
    name: "E-commerce Report",
    description:
      "Product sales, customer acquisition, and inventory metrics.",
    chartType: "Bar + Table",
    visualization: <TableViz />,
  },
  {
    name: "Website Analytics",
    description:
      "Traffic sources, conversion funnels, and page performance.",
    chartType: "Funnel + Geo",
    visualization: <FunnelViz />,
  },
  {
    name: "Custom Report",
    description:
      "AI analyzes your data structure and auto-selects the optimal layout.",
    chartType: "AI-Selected",
    visualization: <AiViz />,
  },
];

export default function TemplateGallery() {
  return (
    <section
      id="templates"
      className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Templates for Every Report
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose from professionally designed templates or let AI pick the
              best one for your data.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template, index) => (
            <FadeIn
              key={template.name}
              delay={index * 0.08}
            >
              <div className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-primary/50 hover:shadow-md">
                <div className="bg-muted/50">{template.visualization}</div>

                <div className="p-6">
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    {template.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground mb-4">
                    {template.description}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {template.chartType}
                  </span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
