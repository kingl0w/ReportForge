interface PaymentFailedTemplateData {
  userName: string;
  nextRetryDate: string;
  gracePeriodEndDate: string;
  updatePaymentUrl: string;
  unsubscribeUrl: string;
}

export function renderPaymentFailedEmail(
  data: PaymentFailedTemplateData
): string {
  const {
    userName,
    nextRetryDate,
    gracePeriodEndDate,
    updatePaymentUrl,
    unsubscribeUrl,
  } = data;

  const primaryColor = "#1e3a5f";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Payment Failed</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:#dc2626;padding:32px;text-align:center;">
            <span style="font-size:20px;font-weight:700;color:#ffffff;">ReportForge</span>
            <h1 style="margin:12px 0 0;font-size:24px;font-weight:700;color:#ffffff;">Payment Failed</h1>
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
                    We were unable to process your latest payment. Your account is still active during a grace period, but please update your payment method to avoid service interruption.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:0 0 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;">
                    <tr>
                      <td>
                        <p style="margin:0 0 8px;font-size:14px;color:#991b1b;"><strong>Next retry:</strong> ${esc(nextRetryDate)}</p>
                        <p style="margin:0;font-size:14px;color:#991b1b;"><strong>Grace period ends:</strong> ${esc(gracePeriodEndDate)}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:0 0 24px;">
                  <a href="${esc(updatePaymentUrl)}" style="display:inline-block;background-color:${primaryColor};color:#ffffff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    Update Payment Method
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              If you believe this is an error, please contact support.
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
