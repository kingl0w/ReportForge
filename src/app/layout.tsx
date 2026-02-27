import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://reportforge.com"
  ),
  title: {
    template: "%s | ReportForge",
    default: "ReportForge — Transform Data into Professional Reports",
  },
  description:
    "Upload CSV, Excel, or JSON data and get polished, professional PDF/DOCX reports with charts, summaries, and AI-powered insights in seconds.",
  keywords: [
    "report generator",
    "data analysis",
    "PDF reports",
    "CSV to report",
    "business intelligence",
    "automated reports",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "https://reportforge.com",
    siteName: "ReportForge",
    title: "ReportForge — Transform Data into Professional Reports",
    description:
      "Upload your data and get polished reports with charts and AI insights in seconds.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ReportForge — Transform Data into Professional Reports",
    description:
      "Upload your data and get polished reports with charts and AI insights in seconds.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.className} antialiased`}
      >
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
