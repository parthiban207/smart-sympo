// agent-notes: { ctx: "Express server with Nodemailer Gmail SMTP for Welcome & First Login emails and Event Registration confirmations", deps: ["express", "nodemailer", "cors", "dotenv"], state: "active", last: "antigravity@2026-08-26" }

import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env or root .env
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Email Service Configuration - Gmail SMTP Transporter
const createGmailTransporter = () => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    console.warn('[Nodemailer Warning] GMAIL_USER or GMAIL_APP_PASSWORD not set in environment. Running in simulated fallback mode.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });
};

const transporter = createGmailTransporter();

// Helper to send email or simulate gracefully if credentials are not active
const dispatchEmail = async ({ to, subject, text, html }) => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const senderEmail = gmailUser || 'noreply@smartsympo.edu';

  const mailOptions = {
    from: `"Smart-Sympo 2026" <${senderEmail}>`,
    to,
    subject,
    text,
    html,
  };

  if (!gmailUser || !gmailPass) {
    console.log(`\n======================================================`);
    console.log(`[Email Service Simulated] Transporter missing GMAIL_USER/GMAIL_APP_PASSWORD.`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text || 'HTML Content'}`);
    console.log(`======================================================\n`);
    return {
      success: true,
      simulated: true,
      message: `Email simulated (Set GMAIL_USER & GMAIL_APP_PASSWORD in environment for live SMTP delivery)`,
      to,
      subject,
    };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Nodemailer Success] Email sent to ${to}:`, info.messageId);
    return { success: true, dispatched: true, messageId: info.messageId, to, subject };
  } catch (err) {
    console.error(`[Nodemailer Error] Delivery failed to ${to}:`, err.message);
    throw err;
  }
};

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Smart-Sympo Automated Email Dispatch Service',
    smtpConfigured: Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
    timestamp: new Date().toISOString(),
  });
});

// =========================================================================
// 1. WELCOME & FIRST LOGIN EMAIL
// Trigger: When a user (Student/Coordinator) logs in for the first time.
// =========================================================================
const handleWelcomeEmail = async (req, res) => {
  try {
    const { email, name, role } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'Missing recipient email address.' });
    }

    const studentName = name || email.split('@')[0] || 'Student';
    const userRole = role || 'Student';
    const subject = '🎉 Welcome to Smart-Sympo 2026!';

    const textContent = `Hi ${studentName},\n\nWelcome to Smart-Sympo! Your account has been successfully activated.\nYou can now explore technical/non-technical events, register with one click, and access your digital QR entry pass from your dashboard.\n\nBest regards,\nSmart-Sympo Organizing Team`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Smart-Sympo 2026</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #1e293b; border: 1px solid #334155; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);">
                
                <!-- Hero Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%); padding: 36px 32px; text-align: center;">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                      Smart-Sympo 2026
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                      🎉 Welcome to Smart-Sympo!
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px; font-weight: 500;">
                      Account Activated & Verified (${userRole})
                    </p>
                  </td>
                </tr>

                <!-- Email Body -->
                <tr>
                  <td style="padding: 36px 32px;">
                    <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9; margin-top: 0;">
                      Hi <strong>${studentName}</strong>,
                    </p>
                    
                    <p style="font-size: 15px; line-height: 1.65; color: #cbd5e1; margin-top: 12px;">
                      Welcome to Smart-Sympo! Your account has been successfully activated. 
                      You can now explore technical/non-technical events, register with one click, and access your digital QR entry pass from your dashboard.
                    </p>

                    <!-- Key Feature Highlights -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; margin: 24px 0; border-collapse: separate;">
                      <tr>
                        <td style="padding: 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-bottom: 12px;">
                                <div style="color: #818cf8; font-weight: 700; font-size: 14px;">⚡ 1-Click Instant Registration</div>
                                <div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">Smart clash-detection prevents overlapping event schedules.</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-bottom: 12px;">
                                <div style="color: #34d399; font-weight: 700; font-size: 14px;">📲 Dynamic TOTP Entry Pass</div>
                                <div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">Rotating 15-second secure QR token for venue hall access.</div>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <div style="color: #fbbf24; font-weight: 700; font-size: 14px;">📍 Real-Time Hall Updates</div>
                                <div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">Live delay broadcasts, navigation routing, and agenda updates.</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 0;">
                      Best regards,<br>
                      <strong style="color: #f8fafc;">Smart-Sympo Organizing Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #0f172a; padding: 24px 32px; border-top: 1px solid #334155; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">
                      Smart-Sympo 2026 • Real-Time Multi-Venue Event Management System
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

    const result = await dispatchEmail({
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in /api/send-welcome-email:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch welcome email.' });
  }
};

app.post('/api/send-welcome-email', handleWelcomeEmail);
app.post('/api/send-first-login-email', handleWelcomeEmail);

// =========================================================================
// 2. EVENT REGISTRATION CONFIRMATION EMAIL
// Trigger: Immediately after a student successfully registers for any event.
// =========================================================================
const handleEventConfirmationEmail = async (req, res) => {
  try {
    const { email, name, eventName, category, venue, timeSlot, eventDate } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'Missing recipient email address.' });
    }

    const studentName = name || email.split('@')[0] || 'Student';
    const title = eventName || 'Symposium Event';
    const eventCategory = category || 'Technical';
    const eventVenue = venue || 'Main Auditorium';
    const slot = timeSlot || 'Scheduled Time Slot';
    const date = eventDate || new Date().toLocaleDateString('en-US', { dateStyle: 'long' });

    const subject = `✅ Registration Confirmed: ${title} - Smart-Sympo`;

    const textContent = `Hi ${studentName},\n\nYou have successfully registered for ${title} (${eventCategory}).\n- Venue / Hall: ${eventVenue}\n- Scheduled Time: ${slot}\n- Date: ${date}\n\nPlease keep your profile QR pass ready at the venue for coordinator check-in.\n\nBest of luck!\n\nSmart-Sympo Organizing Team`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Registration Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #151d30; border: 1px solid #2a364f; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
                
                <!-- Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%); padding: 32px; text-align: center;">
                    <div style="font-size: 38px; margin-bottom: 6px;">✅</div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                      Registration Confirmed!
                    </h1>
                    <p style="margin: 6px 0 0 0; color: #d1fae5; font-size: 14px; font-weight: 600;">
                      ${title}
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <p style="font-size: 16px; color: #f1f5f9; margin-top: 0;">
                      Hi <strong>${studentName}</strong>,
                    </p>
                    
                    <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
                      You have successfully registered for <strong style="color: #34d399;">${title}</strong> (${eventCategory}).
                    </p>

                    <!-- Event Detail Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; margin: 24px 0; border-collapse: separate;">
                      <tr>
                        <td style="padding: 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-bottom: 12px;">
                                <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">📍 Venue / Hall</span>
                                <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-top: 2px;">${eventVenue}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-bottom: 12px;">
                                <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">⏰ Scheduled Time</span>
                                <div style="font-size: 14px; color: #e2e8f0; font-weight: 600; margin-top: 2px;">${slot}</div>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">📅 Date</span>
                                <div style="font-size: 14px; color: #e2e8f0; font-weight: 600; margin-top: 2px;">${date}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- QR Instructions -->
                    <div style="background-color: #064e3b; border: 1px solid #059669; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
                      <p style="margin: 0; font-size: 13px; color: #a7f3d0; font-weight: 600;">
                        📲 Venue Check-in Pass
                      </p>
                      <p style="margin: 6px 0 0 0; font-size: 13px; color: #ecfdf5; line-height: 1.5;">
                        Please keep your profile QR pass ready at the venue for coordinator check-in.
                      </p>
                    </div>

                    <p style="font-size: 15px; font-weight: 600; color: #34d399; margin: 20px 0 0 0;">
                      Best of luck!
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #0b0f19; padding: 20px 32px; border-top: 1px solid #2a364f; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">
                      Smart-Sympo 2026 • Multi-Venue Live Event Dispatcher
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

    const result = await dispatchEmail({
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in /api/send-event-confirmation:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch event confirmation email.' });
  }
};

app.post('/api/send-event-confirmation', handleEventConfirmationEmail);
app.post('/api/send-registration-email', handleEventConfirmationEmail);

// Backward-compatible Login Alert Endpoint
app.post('/api/send-login-alert', async (req, res) => {
  try {
    const { email, name, role, timestamp } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'Missing recipient email address.' });
    }
    const userName = name || email.split('@')[0] || 'User';
    const userRole = role || 'Student';
    const formattedTimestamp = timestamp || new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' });

    const subject = '🔐 Login Alert: Smart-Sympo Portal';
    const text = `Hi ${userName},\n\nYou have logged in as ${userRole} at ${formattedTimestamp}.\nIf this wasn't you, please report to the admin desk immediately.\n\nSmart-Sympo Team`;
    const html = `
      <div style="background-color:#0f172a;padding:24px;color:#f8fafc;font-family:sans-serif;">
        <h2 style="color:#6366f1;">🔐 Smart-Sympo Login Alert</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>You have successfully logged in as <span style="color:#a5b4fc;font-weight:bold;">${userRole}</span> at <strong>${formattedTimestamp}</strong>.</p>
        <p style="color:#94a3b8;font-size:12px;">If this wasn't you, please contact the admin desk immediately.</p>
      </div>
    `;

    const result = await dispatchEmail({ to: email, subject, text, html });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Smart-Sympo Email Service] Running on http://localhost:${PORT}`);
  console.log(`[SMTP Status] GMAIL_USER: ${process.env.GMAIL_USER ? process.env.GMAIL_USER : 'Not set (Simulation Mode Active)'}`);
});
