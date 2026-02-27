interface ReportCompleteTemplateData {
  userName: string;
  reportTitle: string;
  downloadUrl: string;
  previewImageUrl?: string;
  generatedAt: Date;
  primaryColor?: string;
  logoUrl?: string;
  unsubscribeUrl: string;
}

export function renderReportCompleteEmail(
  data: ReportCompleteTemplateData
): string {
  const {
    userName,
    reportTitle,
    downloadUrl,
    previewImageUrl,
    generatedAt,
    primaryColor = "#1e3a5f",
    logoUrl,
    unsubscribeUrl,
  } = data;

  const formattedDate = generatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const logoHtml = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="Logo" style="max-height:40px;max-width:150px;margin-bottom:16px;" />`
    : `<span style="font-size:20px;font-weight:700;color:${primaryColor};">ReportForge</span>`;

  const previewHtml = previewImageUrl
    ? `<tr>
        <td style="padding:0 0 24px;">
          <img src="${esc(previewImageUrl)}" alt="Report preview" style="width:100%;border-radius:8px;border:1px solid #e2e8f0;" />
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your Report is Ready</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:${primaryColor};padding:32px;text-align:center;">
            ${logoHtml.includes("img") ? logoHtml : `<div style="margin-bottom:8px;">${logoHtml}</div>`}
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Your Report is Ready</h1>
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
                    Your report <strong>&ldquo;${esc(reportTitle)}&rdquo;</strong> has been generated and is ready to download.
                  </p>
                  <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">Generated on ${esc(formattedDate)}</p>
                </td>
              </tr>

              ${previewHtml}

              <tr>
                <td align="center" style="padding:0 0 24px;">
                  <a href="${esc(downloadUrl)}" style="display:inline-block;background-color:${primaryColor};color:#ffffff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    Download Report
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              You're receiving this because you generated a report on ReportForge.
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
