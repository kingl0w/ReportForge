"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#templates", label: "Templates" },
    { href: "#pricing", label: "Pricing" },
  ];

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">ReportForge</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Get Started
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-white md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-800 md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t border-slate-800 pt-4">
                <Link
                  href="/auth/login"
                  className="rounded-lg px-3 py-2 text-center text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-500"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">ReportForge</span>
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              Transform raw data into polished, professional reports in seconds.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Product</h3>
            <ul className="mt-3 space-y-2">
              <li><a href="#features" className="text-sm text-slate-500 transition-colors hover:text-slate-300">Features</a></li>
              <li><a href="#templates" className="text-sm text-slate-500 transition-colors hover:text-slate-300">Templates</a></li>
              <li><a href="#pricing" className="text-sm text-slate-500 transition-colors hover:text-slate-300">Pricing</a></li>
              <li><Link href="/auth/signup" className="text-sm text-slate-500 transition-colors hover:text-slate-300">Get Started</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Resources</h3>
            <ul className="mt-3 space-y-2">
              <li><span className="text-sm text-slate-500">Documentation</span></li>
              <li><span className="text-sm text-slate-500">API Reference</span></li>
              <li><span className="text-sm text-slate-500">Changelog</span></li>
              <li><span className="text-sm text-slate-500">Status</span></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Company</h3>
            <ul className="mt-3 space-y-2">
              <li><span className="text-sm text-slate-500">About</span></li>
              <li><span className="text-sm text-slate-500">Blog</span></li>
              <li><span className="text-sm text-slate-500">Privacy</span></li>
              <li><span className="text-sm text-slate-500">Terms</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 md:flex-row">
          <p className="text-sm text-slate-600">
            &copy; {new Date().getFullYear()} ReportForge. All rights reserved.
          </p>
          <div className="flex gap-6">
            <span className="text-sm text-slate-600">Twitter</span>
            <span className="text-sm text-slate-600">GitHub</span>
            <span className="text-sm text-slate-600">Discord</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
