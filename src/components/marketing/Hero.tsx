"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "./fade-in";

const spreadsheetRows = [
  ["Date", "Revenue", "Orders", "Region"],
  ["Jan 1", "$4,230", "89", "US-West"],
  ["Jan 2", "$3,870", "76", "US-East"],
  ["Jan 3", "$5,120", "112", "EU"],
  ["Jan 4", "$2,940", "63", "APAC"],
  ["Jan 5", "$6,310", "134", "US-West"],
];

const chartBars = [
  { height: "45%", label: "Jan" },
  { height: "62%", label: "Feb" },
  { height: "38%", label: "Mar" },
  { height: "75%", label: "Apr" },
  { height: "58%", label: "May" },
  { height: "85%", label: "Jun" },
];

function SpreadsheetMockup() {
  return (
    <div className="w-full max-w-[260px] rounded-lg border border-slate-700/60 bg-slate-900/80 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center gap-1.5 border-b border-slate-700/60 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-[10px] font-medium text-slate-400">
          sales_data.csv
        </span>
      </div>
      <div className="p-2">
        <table className="w-full text-[10px]">
          <thead>
            <tr>
              {spreadsheetRows[0].map((cell, i) => (
                <th
                  key={i}
                  className="border-b border-slate-700/40 px-1.5 py-1 text-left font-semibold text-blue-400"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spreadsheetRows.slice(1).map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-slate-800/40 last:border-0"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-1.5 py-1 ${
                      cellIndex === 1
                        ? "font-medium text-emerald-400"
                        : cellIndex === 0
                          ? "text-slate-400"
                          : "text-slate-300"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransformArrow() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-6 md:py-0">
      <motion.div
        animate={{ x: [0, 8, 0] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="flex items-center gap-2"
      >
        <div className="hidden h-px w-8 bg-gradient-to-r from-blue-500 to-violet-500 md:block" />
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 shadow-lg shadow-blue-500/10">
          <ArrowRight className="h-5 w-5 text-blue-400 md:rotate-0 rotate-90" />
        </div>
        <div className="hidden h-px w-8 bg-gradient-to-r from-violet-500 to-blue-500 md:block" />
      </motion.div>
      <span className="mt-2 text-[10px] font-medium tracking-wider text-slate-500 uppercase">
        ReportForge
      </span>
    </div>
  );
}

function ReportMockup() {
  return (
    <div className="w-full max-w-[260px] rounded-lg border border-slate-700/60 bg-slate-900/80 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center gap-1.5 border-b border-slate-700/60 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-[10px] font-medium text-slate-400">
          Q1_Report.pdf
        </span>
      </div>
      <div className="space-y-3 p-3">
        <div className="space-y-1">
          <div className="h-2.5 w-3/4 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
          <div className="h-1.5 w-1/2 rounded-full bg-slate-700" />
        </div>

        <div className="rounded-md border border-slate-700/40 bg-slate-800/50 p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-medium text-slate-400">
              Revenue Trend
            </span>
            <span className="text-[9px] font-semibold text-emerald-400">
              +23%
            </span>
          </div>
          <div className="flex items-end gap-1.5" style={{ height: "60px" }}>
            {chartBars.map((bar, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                <motion.div
                  className="w-full rounded-t-sm bg-gradient-to-t from-blue-600 to-violet-500"
                  initial={{ height: 0 }}
                  animate={{ height: bar.height }}
                  transition={{
                    duration: 0.8,
                    delay: 0.3 + i * 0.1,
                    ease: "easeOut",
                  }}
                  style={{ maxHeight: "100%" }}
                />
                <span className="text-[7px] text-slate-500">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <div className="h-1.5 w-full rounded-full bg-slate-700" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <div className="h-1.5 w-4/5 rounded-full bg-slate-700" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            <div className="h-1.5 w-3/5 rounded-full bg-slate-700" />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 rounded-md border border-slate-700/40 bg-slate-800/40 px-2 py-1.5 text-center">
            <div className="text-[9px] font-bold text-blue-400">$22.5K</div>
            <div className="text-[7px] text-slate-500">Revenue</div>
          </div>
          <div className="flex-1 rounded-md border border-slate-700/40 bg-slate-800/40 px-2 py-1.5 text-center">
            <div className="text-[9px] font-bold text-violet-400">474</div>
            <div className="text-[7px] text-slate-500">Orders</div>
          </div>
          <div className="flex-1 rounded-md border border-slate-700/40 bg-slate-800/40 px-2 py-1.5 text-center">
            <div className="text-[9px] font-bold text-emerald-400">+23%</div>
            <div className="text-[7px] text-slate-500">Growth</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/3 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
        <FadeIn delay={0.1} direction="up" className="text-center">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Turn Raw Data Into Stunning Reports in Seconds
          </h1>
        </FadeIn>

        <FadeIn delay={0.2} direction="up" className="text-center">
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg md:text-xl">
            Upload a CSV or Excel file, and ReportForge generates polished PDF
            reports with charts, summaries, and AI-powered insights —
            automatically.
          </p>
        </FadeIn>

        <FadeIn delay={0.3} direction="up">
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="#templates"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-transparent px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              See Examples
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.5} direction="up" duration={0.7} className="w-full">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="mt-16 flex w-full flex-col items-center justify-center gap-4 md:mt-20 md:flex-row md:gap-0"
          >
            <SpreadsheetMockup />
            <TransformArrow />
            <ReportMockup />
          </motion.div>
        </FadeIn>

        <FadeIn delay={0.7} direction="up">
          <p className="mt-12 text-center text-xs text-slate-500 sm:text-sm">
            Trusted by freelancers, agencies, and e-commerce operators
            worldwide.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
