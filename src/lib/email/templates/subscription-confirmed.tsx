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

export interface SubscriptionConfirmedEmailProps {
  userName: string;
  planName: string;
  dashboardUrl: string;
}

export function SubscriptionConfirmedEmail({
  userName = "there",
  planName = "Pro",
  dashboardUrl = "https://example.com/dashboard",
}: SubscriptionConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your {planName} subscription is now active</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>ReportForge</Text>

          <Section style={successBanner}>
            <Text style={checkmark}>&#10003;</Text>
          </Section>

          <Heading style={heading}>Subscription Confirmed</Heading>

          <Text style={paragraph}>Hi {userName},</Text>

          <Text style={paragraph}>
            Your <strong>{planName}</strong> subscription is now active. You now
            have access to all premium features.
          </Text>

          <Section style={perksSection}>
            <Text style={perksHeading}>What&rsquo;s included</Text>

            <Row style={perkRow}>
              <Column style={perkIconCol}>
                <Text style={perkIcon}>&#10003;</Text>
              </Column>
              <Column>
                <Text style={perkText}>100 reports per month</Text>
              </Column>
            </Row>

            <Row style={perkRow}>
              <Column style={perkIconCol}>
                <Text style={perkIcon}>&#10003;</Text>
              </Column>
              <Column>
                <Text style={perkText}>PDF and DOCX export formats</Text>
              </Column>
            </Row>

            <Row style={perkRow}>
              <Column style={perkIconCol}>
                <Text style={perkIcon}>&#10003;</Text>
              </Column>
              <Column>
                <Text style={perkText}>Custom branding (logo, colors, footer)</Text>
              </Column>
            </Row>

            <Row style={perkRow}>
              <Column style={perkIconCol}>
                <Text style={perkIcon}>&#10003;</Text>
              </Column>
              <Column>
                <Text style={perkText}>Unlimited file uploads per report</Text>
              </Column>
            </Row>

            <Row style={perkRow}>
              <Column style={perkIconCol}>
                <Text style={perkIcon}>&#10003;</Text>
              </Column>
              <Column>
                <Text style={perkText}>Weekly report digest emails</Text>
              </Column>
            </Row>
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={dashboardUrl}>
              Go to Dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            ReportForge &mdash; Your data, beautifully reported.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default SubscriptionConfirmedEmail;

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

const successBanner = {
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const checkmark = {
  display: "inline-block" as const,
  width: "48px",
  height: "48px",
  lineHeight: "48px",
  borderRadius: "50%",
  backgroundColor: "#f0fdf4",
  color: "#16a34a",
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

const perksSection = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "16px",
  margin: "0 0 24px",
};

const perksHeading = {
  fontSize: "14px",
  fontWeight: "600" as const,
  color: "#334155",
  margin: "0 0 12px",
};

const perkRow = {
  marginBottom: "8px",
};

const perkIconCol = {
  width: "28px",
  verticalAlign: "top" as const,
};

const perkIcon = {
  color: "#16a34a",
  fontSize: "14px",
  fontWeight: "700" as const,
  margin: "0",
};

const perkText = {
  fontSize: "14px",
  color: "#475569",
  margin: "0",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const button = {
  backgroundColor: "#1e3a5f",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600" as const,
  padding: "14px 32px",
  borderRadius: "8px",
  textDecoration: "none",
  display: "inline-block",
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
