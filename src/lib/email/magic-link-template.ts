/**
 * Beautiful magic link email template for Needlepoint
 */

export function getMagicLinkEmail({
  url,
  host,
}: {
  url: string;
  host: string;
}): { subject: string; html: string; text: string } {
  const subject = "Sign in to Needlepoint";
  
  const text = `Sign in to Needlepoint

Click the link below to sign in to your account:
${url}

This link expires in 15 minutes. If you didn't request this email, you can safely ignore it.

Questions? Reply to this email or visit our help center.

© 2026 Needlepoint`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Needlepoint</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAF8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #FAFAF8;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          
          <!-- Logo Section -->
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center;">
              <div style="width: 56px; height: 56px; margin: 0 auto; background-color: #E86142; border-radius: 12px; line-height: 56px; font-size: 28px;">
                🧵
              </div>
            </td>
          </tr>
          
          <!-- Content Section -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              
              <!-- Heading -->
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #45423C; text-align: center; line-height: 1.3;">
                Sign in to Needlepoint
              </h1>
              
              <!-- Body Text -->
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #5C5850; text-align: center;">
                Click the button below to securely sign in to your account. This link expires in <strong>15 minutes</strong>.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" style="height:52px;v-text-anchor:middle;width:260px;" arcsize="15%" stroke="f" fillcolor="#E86142">
                    <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">
                    Continue to Needlepoint →
                    </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${url}" style="display: inline-block; background-color: #E86142; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 12px; text-align: center;">
                      Continue to Needlepoint →
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              
              <!-- Fallback Link -->
              <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.6; color: #7A756C; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.5; color: #A8A49A; text-align: center; word-break: break-all;">
                ${url}
              </p>
              
            </td>
          </tr>
          
          <!-- Security Message -->
          <tr>
            <td style="padding: 24px 40px; background-color: #F5F4F0; border-top: 1px solid #E8E6E0;">
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #7A756C; text-align: center;">
                If you didn't request this email, you can safely ignore it. Someone may have entered your email by mistake.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #A8A49A;">
                Questions? <a href="mailto:help@${host}" style="color: #E86142; text-decoration: none;">Reply to this email</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #D4D1C8;">
                © 2026 Needlepoint
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return { subject, html, text };
}
