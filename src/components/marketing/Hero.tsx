"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const spreadsheetRows = [
  ["Date", "Revenue", "Orders", "Region"],
  ["Jan 1", "$4,230", "89", "US-West"],
  ["Jan 2", "$3,870", "76", "US-East"],
  ["Jan 3", "$5,120", "112", "EU"],
  ["Jan 4", "$2,940", "63", "APAC"],
];

const chartBars = [
  { height: "45%" },
  { height: "62%" },
  { height: "38%" },
  { height: "75%" },
  { height: "58%" },
  { height: "85%" },
];

function SpreadsheetMockup() {
  return (
    <div className="w-full max-w-[240px] rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
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
                  className="border-b border-border px-1.5 py-1 text-left font-semibold text-foreground"
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
                className="border-b border-border/40 last:border-0"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-1.5 py-1 ${
                      cellIndex === 1
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
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

function ReportMockup() {
  return (
    <div className="w-full max-w-[240px] rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Q1_Report.pdf
        </span>
      </div>
      <div className="space-y-3 p-3">
        <div className="space-y-1">
          <div className="h-2 w-3/4 rounded-full bg-foreground/15" />
          <div className="h-1.5 w-1/2 rounded-full bg-foreground/8" />
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-medium text-muted-foreground">
              Revenue Trend
            </span>
            <span className="text-[9px] font-semibold text-emerald-600">
              +23%
            </span>
          </div>
          <div className="flex items-end gap-1" style={{ height: "48px" }}>
            {chartBars.map((bar, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-primary/70"
                style={{ height: bar.height }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-foreground/8" />
          <div className="h-1.5 w-4/5 rounded-full bg-foreground/6" />
          <div className="h-1.5 w-3/5 rounded-full bg-foreground/5" />
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-center px-4 pt-32 pb-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-tight tracking-tight text-foreground sm:text-6xl">
            Your Data Deserves a Better Presentation
          </h1>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
          Upload a CSV or Excel file, and ReportForge generates polished PDF
          reports with charts, summaries, and AI-powered insights —
          automatically.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button asChild>
            <Link href="/auth/signup">
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="#templates">See Examples</Link>
          </Button>
        </div>

        <div className="mt-16 flex w-full flex-col items-center justify-center gap-6 md:mt-20 md:flex-row md:gap-12">
          <SpreadsheetMockup />
          <ArrowRight className="h-5 w-5 rotate-90 text-muted-foreground/50 md:rotate-0" />
          <ReportMockup />
        </div>
      </div>
    </section>
  );
}
