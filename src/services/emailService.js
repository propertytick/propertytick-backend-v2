const logger = require('../utils/logger');

// 2. Purani Resend API Key hata di

// ==================== BREVO API SENDER ====================
const sendViaBrevo = async (toEmail, subject, htmlContent, textContent) => {
  const apiKey = process.env.BREVO_API_KEY;
  
  // 3. Sender email ko naye domain par set kiya
  const senderEmail = process.env.EMAIL_FROM || 'info@propertytick.com'; 
  const senderName = process.env.EMAIL_FROM_NAME || 'PropertyTick';
  
  if (!apiKey) {
    logger.warn(`🧪 [DEV] Brevo API key missing. Email to ${toEmail}`);
    return { success: true, dev: true };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent || '',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Brevo API error');
    }

    logger.info(`📧 Email sent to ${toEmail}: ${data.messageId}`);
    return { success: true, messageId: data.messageId };
  } catch (err) {
    logger.error(`Email send failed to ${toEmail}: ${err.message}`);
    throw new Error('Failed to send email. Please try again.');
  }
};

// ==================== COMMON HEADER & FOOTER ====================
const emailHeader = (icon, title, subtitle) => `  // 👈 title parameter add karein
  <tr>
    <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;text-align:center;">
      <!-- ... -->
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
        ${title || 'PropertyTick'} <!-- 👈 title use karein -->
      </h1>
      <!-- ... -->
    </td>
  </tr>
`;

const emailFooter = () => `
  <tr>
    <td style="background:#0f172a;padding:24px 40px;text-align:center;">
      <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;">
        © ${new Date().getFullYear()} PropertyTick. All rights reserved.
      </p>
      <p style="margin:0;color:#64748b;font-size:11px;">
        Need help? Contact us at info@propertytick.com
      </p>
    </td>
  </tr>
`;

const emailWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>PropertyTick</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ==================== OTP EMAIL TEMPLATE ====================
const getOtpEmailTemplate = (otp, purpose = 'verification', userName = 'User') => {
  const titles = {
    registration: 'Verify Your Email',
    login: 'Your Login OTP',
    password_reset: 'Reset Your Password',
    email_verification: 'Verify Your Email',
  };

  const title = titles[purpose] || 'Your OTP Code';

  return emailWrapper(`
    ${emailHeader('🏠', title)}
    <tr>
      <td style="padding:40px;">
        <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:800;">
          ${title}
        </h2>
        <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
          Hi ${userName}, use the OTP below to complete your verification. This code is valid for ${process.env.OTP_TTL_MINUTES || 5} minutes.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;padding:24px;">
              <p style="margin:0 0 8px;color:#1d4ed8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">
                Your OTP Code
              </p>
              <p style="margin:0;color:#0f172a;font-size:36px;font-weight:900;letter-spacing:8px;font-family:'Courier New',monospace;">
                ${otp}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
          If you didn't request this OTP, please ignore this email. Never share this OTP with anyone.
        </p>
      </td>
    </tr>
    ${emailFooter()}
  `);
};

// ==================== PASSWORD RESET EMAIL TEMPLATE ====================
const getPasswordResetTemplate = (userName, resetUrl) => {
  return emailWrapper(`
    ${emailHeader('🔒', 'Reset Your Password')}
    <tr>
      <td style="padding:40px;">
        <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:800;">
          Reset Your Password
        </h2>
        <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
          Hi ${userName}, we received a request to reset your PropertyTick password. Click the button below to set a new password.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:16px 0;">
              <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#dc2626);color:#ffffff;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(234,88,12,0.3);">
                🔓 Reset My Password
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 8px;color:#64748b;font-size:13px;line-height:1.6;">
          Or copy this link into your browser:
        </p>
        <div style="background:#f1f5f9;padding:12px 16px;border-radius:8px;word-break:break-all;font-size:12px;color:#334155;font-family:'Courier New',monospace;">
          ${resetUrl}
        </div>
        <div style="margin-top:24px;padding:16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;">
          <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
            ⏰ <strong>Important:</strong> This link will expire in <strong>15 minutes</strong>.
          </p>
        </div>
        <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
          If you didn't request a password reset, please ignore this email. Your password won't be changed.
        </p>
      </td>
    </tr>
    ${emailFooter()}
  `);
};

// ==================== USER ID EMAIL TEMPLATE ====================
const getUserIdTemplate = (userName, userId) => {
  return emailWrapper(`
    ${emailHeader('🆔', 'Your User ID')}
    <tr>
      <td style="padding:40px;">
        <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:800;">
          Your User ID Recovered
        </h2>
        <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
          Hi ${userName}, you requested to recover your User ID. Here it is:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #2563eb;border-radius:12px;padding:32px 24px;">
              <p style="margin:0 0 8px;color:#1d4ed8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">
                Your User ID
              </p>
              <p style="margin:0;color:#0f172a;font-size:32px;font-weight:900;letter-spacing:1px;font-family:'Courier New',monospace;">
                ${userId}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;color:#64748b;font-size:14px;line-height:1.6;">
          You can use this User ID <strong>or</strong> your registered email to login to PropertyTick.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
          <tr>
            <td align="center">
              <a href="${process.env.CLIENT_URL || 'https://www.propertytick.com'}/login" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">
                🔐 Go to Login
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
          If you didn't request this, please ignore this email.
        </p>
      </td>
    </tr>
    ${emailFooter()}
  `);
};

// ==================== SEND OTP EMAIL ====================
const sendOtpEmail = async (toEmail, otp, purpose = 'email_verification', userName = 'User') => {
  const html = getOtpEmailTemplate(otp, purpose, userName);
  const text = `Your OTP is ${otp}. Valid for ${process.env.OTP_TTL_MINUTES || 5} minutes.`;
  return sendViaBrevo(toEmail, `Your PropertyTick OTP: ${otp}`, html, text);
};

// ==================== SEND PASSWORD RESET EMAIL ====================
const sendPasswordResetEmail = async (toEmail, userName, resetUrl) => {
  const html = getPasswordResetTemplate(userName, resetUrl);
  const text = `Reset your PropertyTick password: ${resetUrl}\n\nThis link expires in 15 minutes.`;
  return sendViaBrevo(toEmail, 'Reset Your PropertyTick Password', html, text);
};

// ==================== SEND USER ID EMAIL ====================
const sendUserIdEmail = async (toEmail, userName, userId) => {
  const html = getUserIdTemplate(userName, userId);
  const text = `Your PropertyTick User ID is ${userId}\n\nUse this or your email to login.`;
  return sendViaBrevo(toEmail, 'Your PropertyTick User ID', html, text);
};

// ==================== WELCOME EMAIL ====================
const sendWelcomeEmail = async (toEmail, userName, role) => {
  const roleLabels = {
    broker: 'Property Dealer',
    advocate: 'Advocate',
    colonizer: 'Colonizer',
    buyer: 'Buyer',
    typist: 'Typist',
    stamp_vendor: 'Stamp Vendor',
  };
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#ffffff;">
      <h1 style="color:#2563eb;">Welcome to PropertyTick! 🎉</h1>
      <p>Hi ${userName},</p>
      <p>Your account has been created as a <strong>${roleLabels[role] || role}</strong>.</p>
      <p>Your first <strong>3 deals are completely FREE</strong>.</p>
      <a href="${process.env.CLIENT_URL || 'https://www.propertytick.com'}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px;">Open Dashboard</a>
    </div>
  `;
  const text = `Welcome to PropertyTick, ${userName}! Your first 3 deals are free.`;
  return sendViaBrevo(toEmail, `Welcome to PropertyTick, ${userName}!`, html, text);
};

module.exports = {
  sendOtpEmail,
  sendPasswordResetEmail,
  sendUserIdEmail,
  sendWelcomeEmail,
  sendViaBrevo, 
};