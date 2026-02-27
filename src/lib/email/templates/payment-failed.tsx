import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface PaymentFailedEmailProps {
  userName: string;
  nextRetryDate: string;
  updatePaymentUrl: string;
  supportEmail: string;
}

export function PaymentFailedEmail({
  userName = "there",
  nextRetryDate = "March 5, 2026",
  updatePaymentUrl = "https://example.com/settings",
  supportEmail = "support@reportforge.com",
}: PaymentFailedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Action needed: your payment could not be processed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>ReportForge</Text>

          <Section style={warningBanner}>
            <Text style={warningIcon}>!</Text>
          </Section>

          <Heading style={heading}>Payment Failed</Heading>

          <Text style={paragraph}>Hi {userName},</Text>

          <Text style={paragraph}>
            We were unable to process your most recent payment for your
            ReportForge Pro subscription. Don&rsquo;t worry &mdash; your account
            is still active, and we&rsquo;ll automatically retry the payment.
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>What happened</Text>
            <Text style={infoText}>
              Your payment method on file was declined. This can happen due to
              an expired card, insufficient funds, or a temporary bank hold.
            </Text>

            <Text style={infoLabel}>Next retry</Text>
            <Text style={infoText}>{nextRetryDate}</Text>
          </Section>

          <Text style={paragraph}>
            To avoid any interruption to your service, please update your
            payment method before the next retry date.
          </Text>

          <Section style={buttonSection}>
            <Button style={button} href={updatePaymentUrl}>
              Update Payment Method
            </Button>
          </Section>

          <Text style={secondaryText}>
            If you believe this is a mistake or need help, contact us at{" "}
            <Link href={`mailto:${supportEmail}`} style={link}>
              {supportEmail}
            </Link>
            .
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            ReportForge &mdash; Your data, beautifully reported.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default PaymentFailedEmail;

const main = {
  backgroundColor: "#f8fafc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "600px",
  borderRadius: "12px",
};

const logo = {
  fontSize: "20px",
  fontWeight: "700" as const,
  color: "#1e3a5f",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const warningBanner = {
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const warningIcon = {
  display: "inline-block" as const,
  width: "48px",
  height: "48px",
  lineHeight: "48px",
  borderRadius: "50%",
  backgroundColor: "#fef2f2",
  color: "#dc2626",
  fontSize: "24px",
  fontWeight: "700" as const,
  textAlign: "center" as const,
  margin: "0 auto",
};

const heading = {
  fontSize: "24px",
  fontWeight: "700" as const,
  color: "#1e293b",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#475569",
  margin: "0 0 16px",
};

const infoBox = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "16px",
  margin: "0 0 24px",
};

const infoLabel = {
  fontSize: "13px",
  fontWeight: "600" as const,
  color: "#991b1b",
  margin: "0 0 4px",
};

const infoText = {
  fontSize: "14px",
  color: "#7f1d1d",
  lineHeight: "1.5",
  margin: "0 0 12px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const button = {
  backgroundColor: "#dc2626",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600" as const,
  padding: "14px 32px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
};

const secondaryText = {
  fontSize: "13px",
  color: "#94a3b8",
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const link = {
  color: "#1e3a5f",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const footer = {
  fontSize: "12px",
  color: "#94a3b8",
  textAlign: "center" as const,
  margin: "0",
};
