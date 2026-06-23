import nodemailer from "nodemailer";
import path from "path";

let transporter = null;

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function getHTMLTemplate({ name, title, message, absoluteActionUrl, appUrl, type, priority, module, customerName, customerMobile, policyNumber, amount }) {
  const typeStyles = {
    RENEWAL: { label: "Policy Renewal", color: "#059669", bg: "#d1fae5" },
    CLAIM: { label: "Claim Request", color: "#dc2626", bg: "#fee2e2" },
    FOLLOW_UP: { label: "Follow Up", color: "#7c3aed", bg: "#ede9fe" },
    CALL: { label: "Phone Call", color: "#2563eb", bg: "#dbeafe" },
    ENDORSEMENT: { label: "Policy Endorsement", color: "#db2777", bg: "#fce7f3" },
    SERVICE_REQUEST: { label: "Service Request", color: "#0891b2", bg: "#ecfeff" },
  };

  const priorityStyles = {
    CRITICAL: { label: "Critical", color: "#b91c1c", bg: "#fee2e2" },
    EMERGENCY: { label: "Emergency", color: "#b91c1c", bg: "#fee2e2" },
    HIGH: { label: "High", color: "#c2410c", bg: "#ffedd5" },
    MEDIUM: { label: "Medium", color: "#1d4ed8", bg: "#dbeafe" },
    LOW: { label: "Low", color: "#4b5563", bg: "#f3f4f6" },
  };

  const typeConfig = typeStyles[type?.toUpperCase()] || { label: type || "CRM Task", color: "#4b5563", bg: "#f3f4f6" };
  const priorityConfig = priorityStyles[priority?.toUpperCase()] || null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; width: 100% !important;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 0; width: 100%;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;" cellspacing="0" cellpadding="0" border="0">
          <!-- Main Wrapper -->
          <tr>
            <td style="padding: 24px 32px 32px 32px;">
              <!-- Header Brand Logo -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
                    <a href="${appUrl}" target="_blank" style="text-decoration: none; border: 0; outline: none; display: block;">
                      <img src="cid:logo" alt="BIMAHEADQUARTER" style="height: 120px; width: auto; max-width: 480px; display: block; border: 0;">
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Greeting Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-top: 16px; padding-bottom: 16px;">
                    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; margin: 0 0 8px 0; line-height: 1.3;">
                      Action required on task
                    </h2>
                    <p style="font-size: 15px; color: #64748b; margin: 0; line-height: 1.5;">
                      Hello ${name || "there"}, you have a new pending notification.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Task Details Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; border-collapse: separate;">
                <tr>
                  <td style="padding: 24px;">
                    <!-- Badges -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td style="background-color: ${typeConfig.bg}; color: ${typeConfig.color}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-right: 6px;">
                          ${typeConfig.label}
                        </td>
                        ${priorityConfig ? `
                        <td style="background-color: ${priorityConfig.bg}; color: ${priorityConfig.color}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 8px; border-radius: 4px; display: inline-block;">
                          ${priorityConfig.label}
                        </td>
                        ` : ""}
                      </tr>
                    </table>

                    <!-- Task Headline & Message -->
                    <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px; line-height: 1.4;">
                      ${title}
                    </div>
                    <div style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
                      ${message}
                    </div>

                    <!-- Meta information table -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                      <tr>
                        ${module ? `
                        <td style="font-size: 12px; color: #64748b;">
                          <strong>Module:</strong> ${module}
                        </td>
                        ` : ""}
                        ${type ? `
                        <td style="font-size: 12px; color: #64748b; text-align: right;">
                          <strong>Task Type:</strong> ${typeConfig.label}
                        </td>
                        ` : ""}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Customer Details Box -->
              ${(customerName || customerMobile || policyNumber || amount) ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; border-collapse: separate;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Client Details
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${customerName ? `
                      <tr>
                        <td style="font-size: 14px; color: #64748b; padding-bottom: 8px; width: 30%;"><strong>Name:</strong></td>
                        <td style="font-size: 14px; color: #0f172a; padding-bottom: 8px; font-weight: 600;">${customerName}</td>
                      </tr>
                      ` : ""}
                      ${policyNumber ? `
                      <tr>
                        <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;"><strong>Policy No:</strong></td>
                        <td style="font-size: 14px; color: #0f172a; padding-bottom: 8px; font-family: monospace;">${policyNumber}</td>
                      </tr>
                      ` : ""}
                      ${amount ? `
                      <tr>
                        <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;"><strong>Amount:</strong></td>
                        <td style="font-size: 14px; color: #0f172a; padding-bottom: 8px; font-weight: 600;">₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      ` : ""}
                      ${customerMobile ? `
                      <tr>
                        <td style="font-size: 14px; color: #64748b; padding-top: 4px;"><strong>Contact:</strong></td>
                        <td style="font-size: 14px; color: #0f172a; padding-top: 4px;">
                          <span style="font-weight: 600; vertical-align: middle; margin-right: 8px;">${customerMobile}</span>
                          <a href="tel:${customerMobile}" style="display: inline-block; vertical-align: middle; background-color: #10b981; color: #ffffff !important; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-decoration: none; padding: 6px 12px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            📞 Call
                          </a>
                        </td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- Button CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${absoluteActionUrl}" target="_blank" style="display: block; width: 100%; text-align: center; background-color: #0f172a; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 24px; border-radius: 8px; box-sizing: border-box; -webkit-text-size-adjust: none;">
                      View details on Bima Headquarter &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0 0 12px 0;">
                This is an automated notification from BIMAHEADQUARTER. Please do not reply directly to this message.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td>
                    <a href="${appUrl}" target="_blank" style="font-size: 12px; color: #64748b; text-decoration: none; font-weight: 600;">Dashboard</a>
                  </td>
                  <td style="font-size: 12px; color: #cbd5e1; padding: 0 8px;">•</td>
                  <td>
                    <a href="${absoluteActionUrl}" target="_blank" style="font-size: 12px; color: #64748b; text-decoration: none; font-weight: 600;">View Task</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendFollowUpReminderEmail({ to, name, title, message, actionUrl, type, priority, module, customerName, customerMobile, policyNumber, amount }) {
  const mailer = getTransporter();
  if (!mailer) {
    return { sent: false, skipped: true, reason: "SMTP is not configured" };
  }

  const appUrl = "https://bimaheadquarter.com";
  let absoluteActionUrl = actionUrl?.startsWith("http")
    ? actionUrl
    : `${appUrl}${actionUrl || "/work-center"}`;
  
  if (absoluteActionUrl.includes("127.0.0.1") || absoluteActionUrl.includes("localhost")) {
    absoluteActionUrl = absoluteActionUrl.replace(/https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/, "https://bimaheadquarter.com");
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const html = getHTMLTemplate({ name, title, message, absoluteActionUrl, appUrl, type, priority, module, customerName, customerMobile, policyNumber, amount });
  const logoPath = path.join(process.cwd(), "public/brand/main-logo-wide.webp");

  const textLines = [
    `Hello ${name || "there"},`,
    "",
    message,
    "",
  ];
  if (customerName) textLines.push(`Client Name: ${customerName}`);
  if (policyNumber) textLines.push(`Policy Number: ${policyNumber}`);
  if (amount) textLines.push(`Amount: ₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  if (customerMobile) textLines.push(`Contact: ${customerMobile}`);
  if (customerName || policyNumber || amount || customerMobile) textLines.push("");
  textLines.push(`Open BIMAHEADQUARTER: ${absoluteActionUrl}`);

  await mailer.sendMail({
    from,
    to,
    subject: title,
    text: textLines.join("\n"),
    html,
    attachments: [
      {
        filename: "logo.webp",
        path: logoPath,
        cid: "logo",
      },
    ],
  });

  return { sent: true };
}

export async function sendContactQueryEmail({ name, phone, email, service, message }) {
  const mailer = getTransporter();
  if (!mailer) {
    return { sent: false, skipped: true, reason: "SMTP is not configured" };
  }

  const appUrl = "https://bimaheadquarter.com";
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const to = "insuredeskbhopal@gmail.com";
  const title = `New Consultation Request: ${name}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; width: 100% !important;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 0; width: 100%;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden; border-collapse: separate;" cellspacing="0" cellpadding="0" border="0">
          <!-- Main Wrapper -->
          <tr>
            <td style="padding: 24px 32px 32px 32px;">
              <!-- Header Brand Logo -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
                    <a href="${appUrl}" target="_blank" style="text-decoration: none; border: 0; outline: none; display: block;">
                      <img src="cid:logo" alt="BIMAHEADQUARTER" style="height: 120px; width: auto; max-width: 480px; display: block; border: 0;">
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Greeting Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-top: 16px; padding-bottom: 16px;">
                    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; margin: 0 0 8px 0; line-height: 1.3;">
                      New Query Received
                    </h2>
                    <p style="font-size: 15px; color: #64748b; margin: 0; line-height: 1.5;">
                      A new consultation request has been submitted from the website landing page.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Query Details Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px; border-collapse: separate;">
                <tr>
                  <td style="padding: 24px;">
                    <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px; line-height: 1.4;">
                      Query Details
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 14px; color: #64748b; padding-bottom: 8px; width: 30%;"><strong>Name:</strong></td>
                        <td style="font-size: 14px; color: #0f172a; padding-bottom: 8px; font-weight: 600;">${name}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;"><strong>Phone:</strong></td>
                        <td style="font-size: 14px; color: #0f172a; padding-bottom: 8px;">
                          <span style="font-weight: 600; vertical-align: middle; margin-right: 8px;">${phone}</span>
                          <a href="tel:${phone}" style="display: inline-block; vertical-align: middle; background-color: #10b981; color: #ffffff !important; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-decoration: none; padding: 6px 12px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            📞 Call
                          </a>
                        </td>
                      </tr>
                      ${email ? `
                      <tr>
                        <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;"><strong>Email:</strong></td>
                        <td style="font-size: 14px; color: #0f172a; padding-bottom: 8px;"><a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></td>
                      </tr>
                      ` : ""}
                      ${service ? `
                      <tr>
                        <td style="font-size: 14px; color: #64748b; padding-bottom: 8px;"><strong>Service:</strong></td>
                        <td style="font-size: 14px; color: #0f172a; padding-bottom: 8px; font-weight: 600;">${service}</td>
                      </tr>
                      ` : ""}
                      <tr>
                        <td colspan="2" style="font-size: 14px; color: #64748b; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                          <strong>Message:</strong>
                          <div style="font-size: 14px; color: #334155; line-height: 1.6; margin-top: 8px; background-color: #ffffff; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px;">
                            ${message.replace(/\n/g, "<br>")}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Button CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/crm/admin/login" target="_blank" style="display: block; width: 100%; text-align: center; background-color: #0f172a; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 24px; border-radius: 8px; box-sizing: border-box; -webkit-text-size-adjust: none;">
                      Login to CRM Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0 0 12px 0;">
                This inquiry was received automatically from the BIMAHEADQUARTER landing page.
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

  const logoPath = path.join(process.cwd(), "public/brand/main-logo-wide.webp");

  await mailer.sendMail({
    from,
    to,
    subject: title,
    text: [
      `New consultation inquiry received:`,
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Email: ${email || "N/A"}`,
      `Service: ${service || "N/A"}`,
      `Message: ${message}`,
    ].join("\n"),
    html,
    attachments: [
      {
        filename: "logo.webp",
        path: logoPath,
        cid: "logo",
      },
    ],
  });

  return { sent: true };
}

