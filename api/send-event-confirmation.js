// agent-notes: { ctx: "Vercel Serverless Function for Event Registration Confirmations", deps: ["nodemailer", "./_mailer.js"], state: "active", last: "antigravity@2026-10-01" }

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
  const { email, name, eventName, category, venue, timeSlot, eventDate, passToken, roll_no, collegeName } = body;

  const recipientEmail = (email || '').trim().toLowerCase();

  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    logSafeEmailEvent({
      action: 'EVENT_CONFIRMATION_DISPATCH',
      recipient: recipientEmail,
      success: false,
      error: 'Invalid or missing recipient email address',
    });
    return res.status(400).json({
      success: false,
      error: 'Valid recipient email address is required (e.g. user@domain.com).',
      recipientProvided: Boolean(recipientEmail),
    });
  }

  try {
    const { gmailUser } = getSmtpCredentials();
    const senderEmail = gmailUser || 'smartsympo@gmail.com';
    const studentName = name || (recipientEmail.includes('@') ? recipientEmail.split('@')[0] : 'Student Delegate');
    const title = eventName || 'Symposium Event';
    const eventCategory = category || 'Technical';
    const eventVenue = venue || 'Main Auditorium';
    const eventSlot = timeSlot || '09:00 AM - 11:00 AM';
    const dateStr = eventDate || new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
    const qrToken = passToken || `PASS-${Date.now().toString(36).toUpperCase()}`;

    const subject = `🎟️ Event Registration Confirmation: ${title} - SmartSympo 2026`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; padding: 40px 10px; color: #f8fafc;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%); padding: 36px 32px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 26px;">🎟️ Registration Confirmed!</h1>
            <p style="margin: 8px 0 0 0; color: #d1fae5; font-size: 14px;">Your seat has been reserved</p>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #f1f5f9; margin-top: 0;">Hi <strong>${studentName}</strong>,</p>
            <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
              You are confirmed for <strong>${title}</strong>. Please present your digital dynamic QR pass at the entrance scanner before the session begins.
            </p>
            <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin: 20px 0;">
              <div style="font-size: 12px; font-weight: bold; color: #34d399; text-transform: uppercase; margin-bottom: 10px;">📍 Event Pass Details</div>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Session:</strong> ${title} (${eventCategory})</div>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Venue / Hall:</strong> ${eventVenue}</div>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Time Slot:</strong> ${eventSlot}</div>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Date:</strong> ${dateStr}</div>
              <div style="font-size: 13px; color: #cbd5e1;"><strong>Security Token:</strong> <span style="font-family: monospace; color: #a7f3d0;">${qrToken}</span></div>
            </div>
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">SmartSympo Organizing Team • ${senderEmail}</p>
          </div>
        </div>
      </div>
    `;

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"SmartSympo 2026" <${senderEmail}>`,
      to: recipientEmail,
      replyTo: senderEmail,
      subject,
      text: `Registration Confirmed for ${title}!\nVenue: ${eventVenue}\nTime Slot: ${eventSlot}\nDate: ${dateStr}\nPass Token: ${qrToken}`,
      html,
    });

    logSafeEmailEvent({
      action: 'EVENT_CONFIRMATION_DISPATCH',
      recipient: recipientEmail,
      success: true,
      messageId: info.messageId,
    });

    return res.status(200).json({
      success: true,
      dispatched: true,
      messageId: info.messageId,
      recipient: maskEmail(recipientEmail),
    });
  } catch (err) {
    logSafeEmailEvent({
      action: 'EVENT_CONFIRMATION_DISPATCH',
      recipient: recipientEmail,
      success: false,
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch event confirmation email',
      recipient: maskEmail(recipientEmail),
    });
  }
}

