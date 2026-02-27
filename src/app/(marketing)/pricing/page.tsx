import PricingCards from "@/components/marketing/PricingCards";

export const metadata = {
  title: "Pricing — ReportForge",
  description:
    "Simple, transparent pricing. Start free with 1 report, or go Pro for 100 reports/month at $10/month.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <PricingCards />
    </main>
  );
}
