interface DigestReport {
  title: string;
  downloadUrl: string;
  generatedAt: string;
}

interface WeeklyDigestTemplateData {
  userName: string;
  weekStartDate: string;
  weekEndDate: string;
  reports: DigestReport[];
  totalReportsThisWeek: number;
  primaryColor?: string;
  logoUrl?: string;
  unsubscribeUrl: string;
}

export function renderWeeklyDigestEmail(
  data: WeeklyDigestTemplateData
): string {
  const {
    userName,
    weekStartDate,
    weekEndDate,
    reports,
    totalReportsThisWeek,
    primaryColor = "#1e3a5f",
    logoUrl,
    unsubscribeUrl,
  } = data;

  const logoHtml = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="Logo" style="max-height:40px;max-width:150px;margin-bottom:16px;" />`
    : `<span style="font-size:20px;font-weight:700;color:${primaryColor};">ReportForge</span>`;

  const reportRows = reports
    .map(
      (r) => `<tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
          <p style="margin:0;font-size:15px;font-weight:600;color:#1e293b;">${esc(r.title)}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${esc(r.generatedAt)}</p>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;">
          <a href="${esc(r.downloadUrl)}" style="display:inline-block;background-color:${primaryColor};color:#ffffff;font-size:13px;font-weight:600;padding:8px 16px;border-radius:6px;text-decoration:none;">
            Download
          </a>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your Weekly Report Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:${primaryColor};padding:32px;text-align:center;">
            ${logoHtml.includes("img") ? logoHtml : `<div style="margin-bottom:8px;">${logoHtml}</div>`}
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Weekly Report Digest</h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">${esc(weekStartDate)} &ndash; ${esc(weekEndDate)}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:0 0 16px;">
                  <p style="margin:0;font-size:16px;color:#334155;">Hi ${esc(userName)},</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 24px;">
                  <p style="margin:0;font-size:15px;color:#475569;line-height:1.6;">
                    Here&rsquo;s a summary of your ${totalReportsThisWeek} report${totalReportsThisWeek === 1 ? "" : "s"} from this week.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:0 0 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;overflow:hidden;">
                    <tr>
                      <td style="padding:12px 16px;background:${primaryColor};color:#ffffff;font-size:13px;font-weight:600;">Report</td>
                      <td style="padding:12px 16px;background:${primaryColor};color:#ffffff;font-size:13px;font-weight:600;text-align:right;">Action</td>
                    </tr>
                    ${reportRows}
                  </table>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:0 0 24px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard" style="display:inline-block;background-color:${primaryColor};color:#ffffff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    View Dashboard
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              You're receiving this weekly digest as a Pro subscriber.
              <br />
              <a href="${esc(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
