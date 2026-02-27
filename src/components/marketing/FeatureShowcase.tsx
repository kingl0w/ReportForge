"use client";

import { FadeIn } from "./fade-in";

interface Feature {
  badge: string;
  title: string;
  description: string;
  visual: React.ReactNode;
  reversed: boolean;
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-block bg-blue-500/10 text-blue-400 text-xs font-medium px-3 py-1 rounded-full">
      {label}
    </span>
  );
}

function InsightCardVisual() {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800 p-6 shadow-2xl shadow-blue-500/5">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Revenue
          </p>
          <p className="mt-1 text-3xl font-bold text-white">$142,350</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-sm font-semibold text-emerald-400">
          +23.4%
        </span>
      </div>

      <div className="border-t border-slate-700/50 pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
          Key Insights
        </p>
        <div className="space-y-2.5">
          <div className="h-2.5 w-full rounded-full bg-slate-700/60" />
          <div className="h-2.5 w-4/5 rounded-full bg-slate-700/40" />
          <div className="h-2.5 w-3/5 rounded-full bg-slate-700/30" />
        </div>
      </div>
    </div>
  );
}

function DocumentFormatsVisual() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="relative h-52 w-64">
        <div className="absolute left-6 top-4 h-44 w-36 rotate-[-4deg] rounded-xl border border-slate-700/50 bg-slate-800 p-4 shadow-xl transition-transform duration-300 hover:rotate-[-2deg]">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/20">
              <span className="text-[10px] font-bold text-blue-400">
                DOCX
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-slate-700/50" />
            <div className="h-2 w-4/5 rounded-full bg-slate-700/40" />
            <div className="h-2 w-full rounded-full bg-slate-700/50" />
            <div className="h-2 w-3/5 rounded-full bg-slate-700/30" />
            <div className="mt-3 h-12 w-full rounded-md bg-slate-700/20" />
          </div>
        </div>

        <div className="absolute right-4 top-0 h-44 w-36 rotate-[3deg] rounded-xl border border-slate-700/50 bg-slate-800 p-4 shadow-2xl transition-transform duration-300 hover:rotate-[1deg]">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500/20">
              <span className="text-[10px] font-bold text-red-400">PDF</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-slate-700/50" />
            <div className="h-2 w-3/4 rounded-full bg-slate-700/40" />
            <div className="h-2 w-full rounded-full bg-slate-700/50" />
            <div className="h-2 w-5/6 rounded-full bg-slate-700/30" />
            <div className="mt-3 h-12 w-full rounded-md bg-slate-700/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectionsVisual() {
  const connections = [
    { name: "Shopify", color: "emerald" },
    { name: "Analytics", color: "orange" },
    { name: "Stripe", color: "violet" },
  ] as const;

  const colorMap = {
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      dot: "bg-emerald-400",
      pulse: "bg-emerald-400/50",
    },
    orange: {
      bg: "bg-orange-500/10",
      text: "text-orange-400",
      border: "border-orange-500/20",
      dot: "bg-orange-400",
      pulse: "bg-orange-400/50",
    },
    violet: {
      bg: "bg-violet-500/10",
      text: "text-violet-400",
      border: "border-violet-500/20",
      dot: "bg-violet-400",
      pulse: "bg-violet-400/50",
    },
  } as const;

  return (
    <div className="flex items-center justify-center gap-3">
      {connections.map((connection) => {
        const colors = colorMap[connection.color];
        return (
          <div
            key={connection.name}
            className={`relative rounded-xl border ${colors.border} ${colors.bg} px-5 py-4 text-center shadow-lg`}
          >
            <div className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${colors.pulse} opacity-75`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${colors.dot}`}
              />
            </div>
            <p className={`text-sm font-semibold ${colors.text}`}>
              {connection.name}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">Connected</p>
          </div>
        );
      })}
    </div>
  );
}

function WhiteLabelVisual() {
  const swatches = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-amber-500",
  ];

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800 p-6 shadow-2xl shadow-violet-500/5">
      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-600/50 bg-slate-700">
          <svg
            className="h-6 w-6 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">Acme Corp</p>
          <p className="text-xs text-slate-500">Monthly Performance Report</p>
        </div>
      </div>

      <div className="border-t border-slate-700/50 pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
          Brand Colors
        </p>
        <div className="flex items-center gap-2.5">
          {swatches.map((swatch, i) => (
            <div
              key={i}
              className={`h-7 w-7 rounded-full ${swatch} ring-2 ring-slate-700/50 ring-offset-2 ring-offset-slate-800`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const features: Feature[] = [
  {
    badge: "AI-Powered",
    title: "Insights That Write Themselves",
    description:
      "Our statistical engine analyzes your data locally \u2014 detecting trends, anomalies, and correlations. Then AI generates executive summaries and narratives that sound like a senior analyst wrote them.",
    visual: <InsightCardVisual />,
    reversed: false,
  },
  {
    badge: "Multi-Format",
    title: "PDF and DOCX, Ready to Share",
    description:
      "Generate reports in PDF for polished presentations, or DOCX for easy editing. Both formats include charts, tables, and professional formatting \u2014 ready to share with clients or stakeholders.",
    visual: <DocumentFormatsVisual />,
    reversed: true,
  },
  {
    badge: "Integrations",
    title: "Connect Your Data Sources",
    description:
      "Pull data directly from Shopify, Google Analytics, and more. Set up once, generate reports on demand \u2014 or schedule them to run automatically.",
    visual: <ConnectionsVisual />,
    reversed: false,
  },
  {
    badge: "White-Label",
    title: "Your Brand, Your Reports",
    description:
      "Add your logo, pick your colors, and customize every section. Your clients will never know the report was generated automatically.",
    visual: <WhiteLabelVisual />,
    reversed: true,
  },
];

function FeatureBlock({ feature }: { feature: Feature }) {
  const textDirection = "up" as const;
  const visualDirection = feature.reversed ? "left" : "right";

  return (
    <div className="py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20">
        <FadeIn
          direction={textDirection}
          className={feature.reversed ? "lg:order-2" : "lg:order-1"}
        >
          <div className="max-w-lg">
            <Badge label={feature.badge} />
            <h3 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {feature.title}
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-slate-400">
              {feature.description}
            </p>
          </div>
        </FadeIn>

        <FadeIn
          direction={visualDirection}
          delay={0.15}
          className={feature.reversed ? "lg:order-1" : "lg:order-2"}
        >
          {feature.visual}
        </FadeIn>
      </div>
    </div>
  );
}

export default function FeatureShowcase() {
  return (
    <section className="bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="py-8 text-center">
          <FadeIn direction="up">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
              Everything you need
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Powerful features, zero complexity
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
              From raw data to polished reports in seconds. No design skills
              required.
            </p>
          </FadeIn>
        </div>

        {features.map((feature) => (
          <FeatureBlock key={feature.badge} feature={feature} />
        ))}
      </div>
    </section>
  );
}