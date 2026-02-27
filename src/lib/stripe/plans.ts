export type PlanId = "FREE" | "PRO" | "PER_REPORT";

export type ReportFormat = "PDF" | "DOCX" | "BOTH";

export interface PlanLimits {
  maxFileSize: number;
  maxRows: number;
  maxFilesPerReport: number;
  maxStorageMB: number;
  reportsPerMonth: number;
  formats: ReportFormat[];
  interactiveDashboard: boolean;
  watermark: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  FREE: {
    maxFileSize: 2 * 1024 * 1024,
    maxRows: 5_000,
    maxFilesPerReport: 1,
    maxStorageMB: 50,
    reportsPerMonth: 1,
    formats: ["PDF"],
    interactiveDashboard: false,
    watermark: true,
  },
  PER_REPORT: {
    maxFileSize: 25 * 1024 * 1024,
    maxRows: 100_000,
    maxFilesPerReport: 3,
    maxStorageMB: 500,
    reportsPerMonth: Infinity,
    formats: ["PDF", "DOCX"],
    interactiveDashboard: true,
    watermark: false,
  },
  PRO: {
    maxFileSize: 50 * 1024 * 1024,
    maxRows: 500_000,
    maxFilesPerReport: 10,
    maxStorageMB: 2048,
    reportsPerMonth: 100,
    formats: ["PDF", "DOCX", "BOTH"],
    interactiveDashboard: true,
    watermark: false,
  },
} as const;

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanId] ?? PLAN_LIMITS.FREE;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price: number;
  /**Stripe Price ID — null for free tier*/
  priceId: string | null;
  reportsPerMonth: number;
  mode: "subscription" | "payment" | "none";
  features: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    price: 0,
    priceId: null,
    reportsPerMonth: 1,
    mode: "none",
    features: [
      "1 report",
      "2 MB file limit",
      "5,000 rows",
      "PDF only (watermarked)",
      "AI-powered insights",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: 10,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    reportsPerMonth: 100,
    mode: "subscription",
    features: [
      "100 reports/month",
      "50 MB files",
      "500,000 rows",
      "PDF, DOCX, or both",
      "Interactive dashboards",
      "No watermark",
      "Multi-file upload (10 files)",
      "Custom branding",
    ],
  },
  PER_REPORT: {
    id: "PER_REPORT",
    name: "Pay per Report",
    price: 2.99,
    priceId: process.env.STRIPE_PER_REPORT_PRICE_ID ?? "",
    reportsPerMonth: 1,
    mode: "payment",
    features: [
      "25 MB files",
      "100,000 rows",
      "PDF and DOCX export",
      "Interactive dashboards",
      "No watermark",
      "Up to 3 files per report",
    ],
  },
};

export function getPlanById(id: string): PlanDefinition {
  return PLANS[id as PlanId] ?? PLANS.FREE;
}
