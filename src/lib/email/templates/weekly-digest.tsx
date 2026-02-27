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
  Link,
} from "@react-email/components";

interface DigestReport {
  name: string;
  date: string;
  downloadUrl: string;
}

export interface WeeklyDigestEmailProps {
  userName: string;
  reports: DigestReport[];
  totalGenerated: number;
  topInsight: string;
  weekRange: string;
  dashboardUrl: string;
}

export function WeeklyDigestEmail({
  userName = "there",
  reports = [],
  totalGenerated = 0,
  topInsight = "",
  weekRange = "Feb 20 - Feb 27, 2026",
  dashboardUrl = "https://example.com/dashboard",
}: WeeklyDigestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your weekly report digest: ${totalGenerated} report${totalGenerated === 1 ? "" : "s"} generated`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>ReportForge</Text>

          <Heading style={heading}>Weekly Report Digest</Heading>
          <Text style={weekRangeText}>{weekRange}</Text>

          <Text style={paragraph}>Hi {userName},</Text>

          <Text style={paragraph}>
            Here&rsquo;s a summary of your reporting activity this week.
          </Text>

          <Section style={summaryCard}>
            <Row>
              <Column style={summaryStatCol}>
                <Text style={summaryNumber}>{totalGenerated}</Text>
                <Text style={summaryLabel}>Report{totalGenerated === 1 ? "" : "s"} Generated</Text>
              </Column>
            </Row>
          </Section>

          {topInsight && (
            <Section style={insightBox}>
              <Text style={insightLabel}>Top Insight</Text>
              <Text style={insightText}>{topInsight}</Text>
            </Section>
          )}

          {reports.length > 0 && (
            <Section style={reportList}>
              <Text style={reportListHeading}>Your Reports</Text>
              {reports.map((report) => (
                <Row key={report.name} style={reportRow}>
                  <Column style={reportInfoCol}>
                    <Text style={reportName}>{report.name}</Text>
                    <Text style={reportDate}>{report.date}</Text>
                  </Column>
                  <Column style={reportActionCol}>
                    <Link href={report.downloadUrl} style={downloadLink}>
                      Download
                    </Link>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          <Section style={buttonSection}>
            <Button style={button} href={dashboardUrl}>
              View Dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You&rsquo;re receiving this weekly digest as a Pro subscriber.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WeeklyDigestEmail;

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
  margin: "0 0 4px",
};

const weekRangeText = {
  fontSize: "14px",
  color: "#64748b",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#475569",
  margin: "0 0 16px",
};

const summaryCard = {
  backgroundColor: "#1e3a5f",
  borderRadius: "8px",
  padding: "24px",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const summaryStatCol = {
  textAlign: "center" as const,
};

const summaryNumber = {
  fontSize: "36px",
  fontWeight: "700" as const,
  color: "#ffffff",
  margin: "0 0 4px",
};

const summaryLabel = {
  fontSize: "14px",
  color: "rgba(255,255,255,0.8)",
  margin: "0",
};

const insightBox = {
  backgroundColor: "#f0f9ff",
  border: "1px solid #bae6fd",
  borderRadius: "8px",
  padding: "16px",
  margin: "0 0 24px",
};

const insightLabel = {
  fontSize: "12px",
  fontWeight: "600" as const,
  color: "#0369a1",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 6px",
};

const insightText = {
  fontSize: "14px",
  color: "#0c4a6e",
  lineHeight: "1.5",
  margin: "0",
};

const reportList = {
  margin: "0 0 24px",
};

const reportListHeading = {
  fontSize: "14px",
  fontWeight: "600" as const,
  color: "#334155",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 12px",
};

const reportRow = {
  borderBottom: "1px solid #f1f5f9",
  padding: "12px 0",
};

const reportInfoCol = {
  width: "70%",
};

const reportActionCol = {
  width: "30%",
  textAlign: "right" as const,
  verticalAlign: "middle" as const,
};

const reportName = {
  fontSize: "15px",
  fontWeight: "600" as const,
  color: "#1e293b",
  margin: "0 0 2px",
};

const reportDate = {
  fontSize: "13px",
  color: "#64748b",
  margin: "0",
};

const downloadLink = {
  fontSize: "13px",
  fontWeight: "600" as const,
  color: "#1e3a5f",
  textDecoration: "underline",
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
