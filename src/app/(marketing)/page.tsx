import type { Metadata } from "next";
import Hero from "@/components/marketing/Hero";
import HowItWorks from "@/components/marketing/HowItWorks";
import TemplateGallery from "@/components/marketing/TemplateGallery";
import FeatureShowcase from "@/components/marketing/FeatureShowcase";
import PricingCards from "@/components/marketing/PricingCards";
import Testimonials from "@/components/marketing/Testimonials";
import CTAFooter from "@/components/marketing/CTAFooter";

export const metadata: Metadata = {
  title: "ReportForge — Transform Data into Professional Reports",
  description:
    "Upload CSV, Excel, or JSON data and get polished, professional reports with charts, summaries, and AI-powered insights. Starting at $2.99/report or $10/mo for 100 reports.",
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://reportforge.com";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ReportForge",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Transform raw data into polished, professional reports with charts and AI-powered insights in seconds.",
  offers: [
    {
      "@type": "Offer",
      name: "Pro Plan",
      price: "10.00",
      priceCurrency: "USD",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
      description: "100 reports/month, all templates, priority generation",
    },
    {
      "@type": "Offer",
      name: "Pay Per Report",
      price: "2.99",
      priceCurrency: "USD",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
      description: "Single report generation with all features",
    },
  ],
  url: BASE_URL,
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <HowItWorks />
      <TemplateGallery />
      <FeatureShowcase />
      <PricingCards />
      <Testimonials />
      <CTAFooter />
    </>
  );
}
