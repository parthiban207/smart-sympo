// agent-notes: { ctx: "Vercel Serverless Function for Safe Production Email Diagnostic Testing to arbitrary recipient addresses", deps: ["nodemailer", "./_mailer.js"], state: "active", last: "antigravity@2026-10-01" }

import {
  createTransporter,
  getSmtpCredentials,
  setCorsHeaders,
  isValidEmail,
  maskEmail,
  logSafeEmailEvent,
} from './_mailer.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { email, type = 'welcome', name } = body;

  const recipientEmail = (email || '').trim().toLowerCase();
  const recipientEmailExists = Boolean(recipientEmail && recipientEmail.length > 0);
  const masked = maskEmail(recipientEmail);

  if (!recipientEmailExists || !isValidEmail(recipientEmail)) {
    logSafeEmailEvent({
      action: 'TEST_EMAIL_DISPATCH',
      recipient: recipientEmail,
      success: false,
      error: 'Invalid or missing test recipient email',
    });
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid recipient email address to test (e.g. user@gmail.com).',
      recipientEmailExists,
      maskedRecipient: masked,
      sendMailCalled: false,
      sendMailSucceeded: false,
    });
  }

  let sendMailCalled = false;
  let sendMailSucceeded = false;
  let messageId = null;
  let serverError = null;

  try {
    const { gmailUser } = getSmtpCredentials();
    const senderEmail = gmailUser || 'smartsympo@gmail.com';
    const recipientName = name || (recipientEmail.includes('@') ? recipientEmail.split('@')[0] : 'Test Attendee');

    let subject = '🧪 SmartSympo 2026 - Production Email Delivery Test';
    let contentHeading = '🧪 Live Delivery Test Successful!';
    let contentSub = 'This email confirms that SmartSympo can deliver directly to your mailbox.';

    if (type === 'registration') {
      subject = '🎟️ [TEST] Event Registration Confirmation - SmartSympo 2026';
      contentHeading = '🎟️ Event Registration Confirmed (Test)';
      contentSub = 'This test confirms that event pass notifications reach your registered inbox.';
    } else if (type === 'attendance') {
      subject = '✅ [TEST] Attendance Verification Confirmation - SmartSympo 2026';
      contentHeading = '✅ Attendance Verified (Test)';
      contentSub = 'This test confirms that gate check-in alerts reach your registered inbox.';
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; padding: 40px 10px; color: #f8fafc;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%); padding: 36px 32px; text-align: center;">
            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; margin-bottom: 8px;">
              SmartSympo Delivery Verification
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 24px;">${contentHeading}</h1>
            <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">${contentSub}</p>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #f1f5f9; margin-top: 0;">Hi <strong>${recipientName}</strong>,</p>
            <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
              If you are reading this email, the SmartSympo email delivery pathway to your mailbox (<strong>${recipientEmail}</strong>) is functioning 100% properly.
            </p>
            <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin: 20px 0;">
              <div style="font-size: 12px; font-weight: bold; color: #818cf8; text-transform: uppercase; margin-bottom: 10px;">📋 Delivery Metadata</div>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Sender (System):</strong> ${senderEmail}</div>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Recipient (Your Mailbox):</strong> ${recipientEmail}</div>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Flow Tested:</strong> ${type.toUpperCase()}</div>
              <div style="font-size: 13px; color: #cbd5e1;"><strong>Timestamp:</strong> ${new Date().toUTCString()}</div>
            </div>
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">SmartSympo Engineering Team • ${senderEmail}</p>
          </div>
        </div>
      </div>
    `;

    const transporter = createTransporter();
    sendMailCalled = true;

    const info = await transporter.sendMail({
      from: `"SmartSympo 2026" <${senderEmail}>`,
      to: recipientEmail,
      replyTo: senderEmail,
      subject,
      text: `SmartSympo Email Delivery Test for ${recipientEmail}.\nSender: ${senderEmail}\nTimestamp: ${new Date().toISOString()}`,
      html,
    });

    sendMailSucceeded = true;
    messageId = info.messageId;

    logSafeEmailEvent({
      action: 'TEST_EMAIL_DISPATCH',
      recipient: recipientEmail,
      success: true,
      messageId,
    });

    return res.status(200).json({
      success: true,
      dispatched: true,
      recipientEmailExists: true,
      maskedRecipient: masked,
      sendMailCalled,
      sendMailSucceeded,
      messageId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    serverError = err.message || 'SMTP dispatch error';
    logSafeEmailEvent({
      action: 'TEST_EMAIL_DISPATCH',
      recipient: recipientEmail,
      success: false,
      error: serverError,
    });

    return res.status(500).json({
      success: false,
      recipientEmailExists: true,
      maskedRecipient: masked,
      sendMailCalled,
      sendMailSucceeded: false,
      serverError,
      timestamp: new Date().toISOString(),
    });
  }
}
