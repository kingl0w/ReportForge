import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using ReportForge.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-32 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: March 19, 2026
      </p>

      <div className="mt-10 space-y-10 text-base leading-relaxed text-foreground/85">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p className="mt-3 text-muted-foreground">
            By creating an account or using ReportForge, you agree to these
            Terms of Service. If you do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            2. Description of Service
          </h2>
          <p className="mt-3 text-muted-foreground">
            ReportForge is an AI-powered report generation tool. You upload data
            (CSV, Excel, JSON, or via connected integrations), and the service
            generates formatted PDF and DOCX reports with charts, summaries, and
            AI-generated insights.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            3. User Responsibilities
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              You must own or have the right to use any data you upload.
            </li>
            <li>
              You may not use the service for illegal purposes, to process data
              you are not authorized to handle, or to generate misleading
              reports.
            </li>
            <li>
              You are responsible for maintaining the confidentiality of your
              account credentials.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            4. Payment Terms
          </h2>
          <p className="mt-3 text-muted-foreground">
            Payments are processed securely by Stripe. Pro subscriptions are
            billed monthly and can be canceled at any time — your access
            continues through the end of the billing period. Pay-per-report
            charges are billed at the time of generation.
          </p>
          <p className="mt-2 text-muted-foreground">
            <strong className="text-foreground">Refunds:</strong> Because
            reports are generated instantly and consume server resources, we do
            not offer refunds on generated reports. If you experience a
            technical issue that prevents report delivery, contact us and we
            will resolve it or issue a credit.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            5. Intellectual Property
          </h2>
          <p className="mt-3 text-muted-foreground">
            You own your data and your generated reports. ReportForge does not
            claim any ownership over content you upload or reports you create.
            The ReportForge service, brand, and software remain the property of
            ReportForge.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            6. Limitation of Liability
          </h2>
          <p className="mt-3 text-muted-foreground">
            ReportForge is provided &ldquo;as is&rdquo; without warranties of
            any kind. We are not liable for any damages arising from your use of
            the service, including but not limited to data loss, inaccurate
            AI-generated content, or service interruptions. Our total liability
            is limited to the amount you paid us in the 12 months preceding the
            claim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            7. Termination
          </h2>
          <p className="mt-3 text-muted-foreground">
            You may delete your account at any time. We reserve the right to
            suspend or terminate accounts that violate these terms, engage in
            abusive behavior, or are used for fraudulent purposes. We will
            provide notice when reasonably possible.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            8. Governing Law
          </h2>
          <p className="mt-3 text-muted-foreground">
            These terms are governed by the laws of the State of Nevada, United
            States, without regard to conflict of law principles. Any disputes
            will be resolved in the courts of Nevada.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            9. Contact
          </h2>
          <p className="mt-3 text-muted-foreground">
            Questions about these terms? Reach out via your account settings
            or through our support channels.
          </p>
        </section>
      </div>
    </div>
  );
}
