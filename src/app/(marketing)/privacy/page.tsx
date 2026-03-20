import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ReportForge collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-32 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: March 19, 2026
      </p>

      <div className="mt-10 space-y-10 text-base leading-relaxed text-foreground/85">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            1. Information We Collect
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">Account information</strong> —
              your name, email address, and authentication credentials when you
              sign up.
            </li>
            <li>
              <strong className="text-foreground">Uploaded files</strong> — CSV,
              Excel, JSON, or other data files you upload to generate reports.
            </li>
            <li>
              <strong className="text-foreground">Usage data</strong> — pages
              visited, features used, report generation activity, and basic
              device/browser information.
            </li>
            <li>
              <strong className="text-foreground">Payment information</strong> —
              processed securely by Stripe. We never store your full card number.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            2. How We Use Your Data
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>To generate reports from the data you upload.</li>
            <li>To process payments and manage your subscription.</li>
            <li>To improve the service, fix bugs, and develop new features.</li>
            <li>
              To send transactional emails (report ready, payment receipts) and,
              with your consent, product updates.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            3. Data Storage &amp; Retention
          </h2>
          <p className="mt-3 text-muted-foreground">
            Your account data is stored in Supabase (PostgreSQL). Uploaded files
            are processed to generate your report and then deleted from our
            servers. Generated reports are retained for download until you delete
            them or close your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            4. Third-Party Services
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">Supabase</strong> — database
              hosting and authentication.
            </li>
            <li>
              <strong className="text-foreground">Stripe</strong> — payment
              processing.
            </li>
            <li>
              <strong className="text-foreground">Google AI</strong> — powers
              AI-generated insights in reports. Your data is sent to generate
              narratives and is not retained by Google for training.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            5. Your Rights
          </h2>
          <p className="mt-3 text-muted-foreground">You can:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">Delete your account</strong>{" "}
              at any time from your dashboard settings. This removes all your
              data from our servers.
            </li>
            <li>
              <strong className="text-foreground">Export your data</strong> by
              downloading your generated reports before deleting your account.
            </li>
            <li>
              <strong className="text-foreground">Opt out</strong> of marketing
              emails via the unsubscribe link or your notification settings.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            6. Contact
          </h2>
          <p className="mt-3 text-muted-foreground">
            For privacy-related requests, reach out via your account settings
            or through our support channels.
          </p>
        </section>
      </div>
    </div>
  );
}
