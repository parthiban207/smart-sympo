// agent-notes: { ctx: "Express server with Nodemailer Gmail SMTP for login alerts & event confirmations", deps: ["express", "nodemailer", "cors", "dotenv"], state: "active", last: "antigravity@2026-08-25" }

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
    console.warn('[Nodemailer Warning] GMAIL_USER or GMAIL_APP_PASSWORD not set in environment.');
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
const dispatchEmail = async ({ to, subject, html }) => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const senderEmail = gmailUser || 'noreply@smartsympo.edu';

  const mailOptions = {
    from: `"Smart-Sympo Portal" <${senderEmail}>`,
    to,
    subject,
    html,
  };

  if (!gmailUser || !gmailPass) {
    console.log(`[Email Service Simulated] Transporter missing GMAIL_USER/GMAIL_APP_PASSWORD.`);
    console.log(`Subject: ${subject}`);
    console.log(`Recipient: ${to}`);
    return {
      success: true,
      simulated: true,
      message: `Email simulated (Set GMAIL_USER & GMAIL_APP_PASSWORD in environment for live SMTP delivery)`,
      to,
    };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Nodemailer Success] Email sent to ${to}:`, info.messageId);
    return { success: true, dispatched: true, messageId: info.messageId, to };
  } catch (err) {
    console.error(`[Nodemailer Error] Delivery failed to ${to}:`, err.message);
    throw err;
  }
};

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Smart-Sympo Backend Email Service',
    smtpConfigured: Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
    timestamp: new Date().toISOString(),
  });
});

// 2a. POST /api/send-login-alert
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
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Alert</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 28px 32px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">🔐 Smart-Sympo Security Alert</h1>
                  </td>
                </tr>
                <!-- Content Body -->
                <tr>
                  <td style="padding: 32px;">
                    <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9; margin-top: 0;">Hi <strong>${userName}</strong>,</p>
                    <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                      You have successfully logged in as <span style="display: inline-block; background-color: #3730a3; color: #c7d2fe; font-weight: 600; padding: 2px 10px; border-radius: 6px; font-size: 13px;">${userRole}</span> at <strong>${formattedTimestamp}</strong>.
                    </p>
                    <div style="background-color: #0f172a; border-left: 4px solid #6366f1; border-radius: 8px; padding: 16px; margin: 24px 0;">
                      <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">
                        If this wasn't you, please report to the admin desk immediately to protect your account.
                      </p>
                    </div>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #0f172a; padding: 20px 32px; border-top: 1px solid #334155; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Smart-Sympo Platform • Real-Time Multi-Venue Event Management System</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const result = await dispatchEmail({ to: email, subject, html });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in /api/send-login-alert:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch login alert.' });
  }
});

// 2b. POST /api/send-event-confirmation
app.post('/api/send-event-confirmation', async (req, res) => {
  try {
    const { email, name, eventName, category, venue, timeSlot } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'Missing recipient email address.' });
    }

    const userName = name || email.split('@')[0] || 'Participant';
    const title = eventName || 'Symposium Event';
    const eventCategory = category || 'General Session';
    const eventVenue = venue || 'Main Auditorium';
    const slot = timeSlot || 'Scheduled Time Slot';

    const subject = `🎉 Confirmed: ${title} Registration - Smart-Sympo`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Registration Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #151d30; border: 1px solid #2a364f; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
                <!-- Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%); padding: 32px; text-align: center;">
                    <div style="font-size: 36px; margin-bottom: 8px;">🎉</div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Registration Confirmed!</h1>
                    <p style="margin: 6px 0 0 0; color: #e0f2fe; font-size: 14px;">Smart-Sympo Official Entry Pass</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <p style="font-size: 16px; color: #f1f5f9; margin-top: 0;">Hi <strong>${userName}</strong>,</p>
                    <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
                      Your seat for <strong style="color: #38bdf8;">${title}</strong> has been locked into the live schedule!
                    </p>

                    <!-- Invitation Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; margin: 24px 0; border-collapse: separate;">
                      <tr>
                        <td style="padding: 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-bottom: 12px;">
                                <span style="font-size: 11px; text-transform: uppercase; tracking: 1px; color: #38bdf8; font-weight: 700;">Event Title</span>
                                <div style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 4px;">${title}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-bottom: 12px;">
                                <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Category</span>
                                <div style="font-size: 14px; color: #e2e8f0; font-weight: 600; margin-top: 2px;">🏷️ ${eventCategory}</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-bottom: 12px;">
                                <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Scheduled Time Slot</span>
                                <div style="font-size: 14px; color: #e2e8f0; font-weight: 600; margin-top: 2px;">⏰ ${slot}</div>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Hall / Venue</span>
                                <div style="font-size: 14px; color: #e2e8f0; font-weight: 600; margin-top: 2px;">📍 ${eventVenue}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Reminder Box -->
                    <div style="background-color: #1e1b4b; border: 1px solid #4338ca; border-radius: 12px; padding: 16px; text-align: center;">
                      <p style="margin: 0; font-size: 13px; color: #c7d2fe; font-weight: 600;">
                        📲 Entry Pass Reminder
                      </p>
                      <p style="margin: 4px 0 0 0; font-size: 12px; color: #a5b4fc; line-height: 1.5;">
                        Please keep your digital entry pass active in your Smart-Sympo app dashboard for instant QR scanning at hall entry gates.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #0b0f19; padding: 20px 32px; border-top: 1px solid #2a364f; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Smart-Sympo Platform • Multi-Venue Live Event Dispatcher</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const result = await dispatchEmail({ to: email, subject, html });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in /api/send-event-confirmation:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch event confirmation email.' });
  }
});

app.listen(PORT, () => {
  console.log(`[Smart-Sympo Email Service] Running on http://localhost:${PORT}`);
  console.log(`[SMTP Status] GMAIL_USER: ${process.env.GMAIL_USER ? process.env.GMAIL_USER : 'Not set'}`);
});
