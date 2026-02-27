import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";

export interface WelcomeEmailProps {
  userName: string;
  uploadUrl: string;
  templatesUrl: string;
  dashboardUrl: string;
}

export function WelcomeEmail({
  userName = "there",
  uploadUrl = "https://example.com/reports/new",
  templatesUrl = "https://example.com/templates",
  dashboardUrl = "https://example.com/dashboard",
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to ReportForge - turn your data into professional reports</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>ReportForge</Text>

          <Heading style={heading}>Welcome to ReportForge</Heading>

          <Text style={paragraph}>Hi {userName},</Text>

          <Text style={paragraph}>
            Thanks for signing up! ReportForge transforms your raw data into
            polished, professional reports with charts, insights, and summaries
            &mdash; in seconds.
          </Text>

          <Text style={paragraph}>
            Here&rsquo;s how to get started:
          </Text>

          <Section style={stepsSection}>
            <Row style={stepRow}>
              <Column style={stepNumberCol}>
                <Text style={stepNumber}>1</Text>
              </Column>
              <Column style={stepContentCol}>
                <Text style={stepTitle}>Upload your data</Text>
                <Text style={stepDescription}>
                  Drop a CSV, Excel, or JSON file &mdash; or connect Shopify or
                  Google Analytics.
                </Text>
              </Column>
            </Row>

            <Row style={stepRow}>
              <Column style={stepNumberCol}>
                <Text style={stepNumber}>2</Text>
              </Column>
              <Column style={stepContentCol}>
                <Text style={stepTitle}>Pick a template</Text>
                <Text style={stepDescription}>
                  Choose from Sales, Social Media, Crypto, E-commerce, and more
                  &mdash; or let us auto-select the best fit.
                </Text>
              </Column>
            </Row>

            <Row style={stepRow}>
              <Column style={stepNumberCol}>
                <Text style={stepNumber}>3</Text>
              </Column>
              <Column style={stepContentCol}>
                <Text style={stepTitle}>Download your report</Text>
                <Text style={stepDescription}>
                  Get a beautifully formatted PDF with charts, summaries, and
                  actionable insights.
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={buttonSection}>
            <Button style={primaryButton} href={uploadUrl}>
              Upload Your First Dataset
            </Button>
          </Section>

          <Section style={buttonSection}>
            <Button style={secondaryButton} href={templatesUrl}>
              Browse Templates
            </Button>
          </Section>

          <Text style={secondaryText}>
            You have 1 free report to try it out. Upgrade to Pro for 100
            reports/month at $10/mo, or purchase individual reports for $2.99
            each. Visit your{" "}
            <a href={dashboardUrl} style={{ color: "#1e3a5f" }}>
              dashboard
            </a>{" "}
            to get started.
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

export default WelcomeEmail;

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

const stepsSection = {
  margin: "0 0 24px",
};

const stepRow = {
  marginBottom: "16px",
};

const stepNumberCol = {
  width: "40px",
  verticalAlign: "top" as const,
};

const stepNumber = {
  display: "inline-block" as const,
  width: "28px",
  height: "28px",
  lineHeight: "28px",
  borderRadius: "50%",
  backgroundColor: "#1e3a5f",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  textAlign: "center" as const,
  margin: "0",
};

const stepContentCol = {
  verticalAlign: "top" as const,
  paddingLeft: "8px",
};

const stepTitle = {
  fontSize: "15px",
  fontWeight: "600" as const,
  color: "#1e293b",
  margin: "0 0 4px",
};

const stepDescription = {
  fontSize: "14px",
  color: "#64748b",
  lineHeight: "1.5",
  margin: "0 0 16px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "0 0 12px",
};

const primaryButton = {
  backgroundColor: "#1e3a5f",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600" as const,
  padding: "14px 32px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
};

const secondaryButton = {
  backgroundColor: "#ffffff",
  color: "#1e3a5f",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "10px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
  border: "1px solid #cbd5e1",
};

const secondaryText = {
  fontSize: "13px",
  color: "#94a3b8",
  textAlign: "center" as const,
  margin: "12px 0 0",
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
