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
// 1. WELCOME & STUDENT SIGNUP CONFIRMATION EMAIL
// Trigger: When a student signs up or logs into SmartSympo.
// =========================================================================
const handleWelcomeEmail = async (req, res) => {
  try {
    const { email, name, role, roll_no, collegeName, department, loginUrl } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'Missing recipient email address.' });
    }

    const studentName = name || email.split('@')[0] || 'Student Delegate';
    const userRole = role || 'student';
    const studentRollNo = roll_no || 'STU-2026';
    const studentCollege = collegeName || 'College of Engineering';
    const studentDept = department || 'Computer Science & Engineering';
    const targetLoginUrl = loginUrl || 'http://localhost:5173/login/student';
    const subject = '🎉 Welcome to SmartSympo - Account Activated Successfully!';

    const textContent = `Hi ${studentName},\n\nWelcome to SmartSympo! You have successfully signed up and your account has been activated.\n\nYou can now log in to SmartSympo, browse symposium tracks, register for events with 1-click clash detection, and access your live digital TOTP pass.\n\nAccount Details:\n- Name: ${studentName}\n- Email: ${email}\n- Roll No: ${studentRollNo}\n- College: ${studentCollege}\n- Department: ${studentDept}\n- Login Link: ${targetLoginUrl}\n\nBest regards,\nSmartSympo Organizing Team`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to SmartSympo 2026</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #1e293b; border: 1px solid #334155; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);">
                
                <!-- Hero Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%); padding: 36px 32px; text-align: center;">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                      SmartSympo 2026
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                      🎉 Welcome to SmartSympo!
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px; font-weight: 500;">
                      Student Account Successfully Created & Activated
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
                      Welcome to SmartSympo! Your student registration is complete and your account is now ready for use. 
                      You can log in, explore paper presentations, hackathons, and technical tracks, claim your digital passes, and track your attendance in real-time.
                    </p>

                    <!-- Student Credentials Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; margin: 24px 0; border-collapse: separate;">
                      <tr>
                        <td style="padding: 20px;">
                          <div style="font-size: 12px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                            📋 Your Registered Profile Details
                          </div>
                          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8; width: 35%;">Name:</td>
                              <td style="padding: 4px 0; color: #f8fafc; font-weight: 600;">${studentName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">Email:</td>
                              <td style="padding: 4px 0; color: #f8fafc; font-weight: 600;">${email}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">Roll No / ID:</td>
                              <td style="padding: 4px 0; color: #a5b4fc; font-family: monospace; font-weight: 700;">${studentRollNo}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">College:</td>
                              <td style="padding: 4px 0; color: #f8fafc;">${studentCollege}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">Department:</td>
                              <td style="padding: 4px 0; color: #f8fafc;">${studentDept}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Login Button CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0; text-align: center;">
                      <tr>
                        <td align="center">
                          <a href="${targetLoginUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.5);">
                            🚀 Log In to SmartSympo
                          </a>
                        </td>
                      </tr>
                    </table>

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
                      <strong style="color: #f8fafc;">SmartSympo Organizing Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #0f172a; padding: 24px 32px; border-top: 1px solid #334155; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">
                      SmartSympo 2026 • Real-Time Multi-Venue Event Management System
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

    res.json({
      success: true,
      message: `Welcome email dispatched to ${email}`,
      ...result,
    });
  } catch (err) {
    console.error('[Welcome Email Error]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to dispatch welcome email' });
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
