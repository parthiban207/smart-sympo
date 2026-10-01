// agent-notes: { ctx: "Vercel Serverless Function for Attendance / QR Scan Confirmation emails", deps: ["nodemailer", "./_mailer.js"], state: "active", last: "antigravity@2026-10-01" }

import { createTransporter, getSmtpCredentials, setCorsHeaders } from './_mailer.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      email,
      name,
      studentName,
      eventName,
      eventTitle,
      category,
      venue,
      hallNumber,
      checkInTime,
      attendedAt,
      roll_no,
      rollNo,
      collegeName,
      department,
    } = body;

    const recipientEmail = (email || '').trim();
    if (!recipientEmail) {
      return res.status(400).json({ success: false, error: 'Recipient email address is required.' });
    }

    const { gmailUser } = getSmtpCredentials();
    const senderEmail = gmailUser || 'smartsympo@gmail.com';
    const sName = studentName || name || (recipientEmail.includes('@') ? recipientEmail.split('@')[0] : 'Student Delegate');
    const title = eventTitle || eventName || 'Symposium Session';
    const eventCategory = category || 'Technical Session';
    const hall = hallNumber || venue || 'Main Auditorium';
    const timestamp = checkInTime || attendedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const sRoll = roll_no || rollNo || 'STU-DELEGATE';
    const sCollege = collegeName || 'Symposium Campus';
    const sDept = department || 'Engineering';

    const subject = `✅ SmartSympo Attendance Confirmation: ${title}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; padding: 40px 10px; color: #f8fafc;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%); padding: 36px 32px; text-align: center;">
            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 4px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; margin-bottom: 8px;">
              Gate Check-In Confirmed
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 26px;">✓ Attendance Recorded!</h1>
            <p style="margin: 8px 0 0 0; color: #d1fae5; font-size: 14px;">Your digital QR pass was scanned & verified</p>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #f1f5f9; margin-top: 0;">Hi <strong>${sName}</strong>,</p>
            <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
              Your attendance for <strong>${title}</strong> has been recorded and verified by the event coordinator at <strong>${hall}</strong>.
            </p>
            <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin: 20px 0;">
              <div style="font-size: 12px; font-weight: bold; color: #34d399; text-transform: uppercase; margin-bottom: 10px;">📋 Check-In Verification Summary</div>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Session:</strong> ${title} (${eventCategory})</div>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Venue / Hall:</strong> ${hall}</div>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Verified At:</strong> ${timestamp}</div>
              <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Attendee:</strong> ${sName} (<span style="font-family: monospace; color: #a7f3d0;">${sRoll}</span>)</div>
              <div style="font-size: 13px; color: #cbd5e1;"><strong>Institution:</strong> ${sCollege} (${sDept})</div>
            </div>
            <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 14px; margin: 20px 0; text-align: center;">
              <span style="font-size: 13px; color: #34d399; font-weight: 600;">✨ Participation credit has been linked to your SmartSympo certificate profile.</span>
            </div>
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">SmartSympo Organizing Committee • ${senderEmail}</p>
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
      text: `Attendance Verified for ${title}!\nVenue: ${hall}\nCheck-in Time: ${timestamp}\nStudent: ${sName} (${sRoll})`,
      html,
    });

    console.log(`[Vercel Serverless] Attendance email sent to ${recipientEmail} (MessageID: ${info.messageId})`);
    return res.status(200).json({ success: true, dispatched: true, messageId: info.messageId, to: recipientEmail });
  } catch (err) {
    console.error('[Vercel Serverless Attendance Email Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
