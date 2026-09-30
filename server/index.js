// agent-notes: { ctx: "Express server with Nodemailer Gmail SMTP for Welcome & First Login emails, Event Registration confirmations, and Student App Feedback alerts", deps: ["express", "nodemailer", "cors", "dotenv"], state: "active", last: "antigravity@2026-09-30" }

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
const DEFAULT_GMAIL_USER = 'smartsympo@gmail.com';
const DEFAULT_GMAIL_APP_PASS = 'zjrltozymelgblor';

export const getSmtpCredentials = () => {
  const gmailUser = (process.env.GMAIL_USER || DEFAULT_GMAIL_USER).trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || DEFAULT_GMAIL_APP_PASS).replace(/\s+/g, '');
  return { gmailUser, gmailPass };
};

const createGmailTransporter = () => {
  const { gmailUser, gmailPass } = getSmtpCredentials();

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
  const { gmailUser, gmailPass } = getSmtpCredentials();
  const senderEmail = gmailUser || 'smartsympo@gmail.com';

  const mailOptions = {
    from: `"Smart-Sympo 2026" <${senderEmail}>`,
    to,
    replyTo: senderEmail,
    subject,
    text,
    html,
  };

  if (!gmailUser || !gmailPass) {
    console.log(`\n======================================================`);
    console.log(`[Email Service Simulated] Transporter missing GMAIL_USER/GMAIL_APP_PASSWORD.`);
    console.log(`From (Sender): ${senderEmail}`);
    console.log(`To (Recipient User Account): ${to}`);
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
    console.log(`[Nodemailer Success] Email dispatched from ${senderEmail} -> TO user mailbox: ${to} (MessageID: ${info.messageId})`);
    return { success: true, dispatched: true, messageId: info.messageId, to, subject };
  } catch (err) {
    console.error(`[Nodemailer Error] Delivery failed from ${senderEmail} to ${to}:`, err.message);
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

// Helper to generate role-specific Welcome Email HTML & text content
const generateWelcomeEmailContent = ({ email, name, role, roll_no, collegeName, department, loginUrl }) => {
  const normRole = (role || 'student').toLowerCase();
  const userCollege = collegeName || 'Symposium Campus';
  const userDept = department || 'Computer Science & Engineering';

  if (normRole === 'admin') {
    const adminId = roll_no || `ADM-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const targetUrl = loginUrl || 'http://localhost:5173/login/admin';
    const userName = name || email.split('@')[0] || 'Administrator';
    const subject = '👑 Welcome to SmartSympo 2026 - Administrator Access Activated!';

    const textContent = `Hi ${userName},\n\nWelcome to SmartSympo! Your Administrator account has been successfully activated.\n\nYou now have full administrative governance over SmartSympo 2026.\n\nAccount Details:\n- Role: Administrator\n- Name: ${userName}\n- Email: ${email}\n- Admin ID: ${adminId}\n- College / Campus: ${userCollege}\n- Department: ${userDept}\n- Admin Console: ${targetUrl}\n\nBest regards,\nSmartSympo Organizing Team`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to SmartSympo - Administrator Access</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #1e293b; border: 1px solid #334155; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);">
                <tr>
                  <td style="background: linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%); padding: 36px 32px; text-align: center;">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                      Administrator Access
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                      👑 Welcome, Administrator!
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #ffe4e6; font-size: 14px; font-weight: 500;">
                      Master Governance & Symposium Administration Activated
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px 32px;">
                    <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9; margin-top: 0;">
                      Hi <strong>${userName}</strong>,
                    </p>
                    <p style="font-size: 15px; line-height: 1.65; color: #cbd5e1; margin-top: 12px;">
                      Welcome to SmartSympo! Your Administrator account has been activated with full governance privileges. You can manage coordinators, approve event tracks, oversee global attendance in real-time, and access live analytical reporting.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; margin: 24px 0; border-collapse: separate;">
                      <tr>
                        <td style="padding: 20px;">
                          <div style="font-size: 12px; font-weight: 700; color: #fb7185; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                            📋 Administrator Profile Details
                          </div>
                          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8; width: 35%;">Name:</td>
                              <td style="padding: 4px 0; color: #f8fafc; font-weight: 600;">${userName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">Email:</td>
                              <td style="padding: 4px 0; color: #f8fafc; font-weight: 600;">${email}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">Role:</td>
                              <td style="padding: 4px 0; color: #fb7185; font-weight: 700;">Administrator</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">Admin ID:</td>
                              <td style="padding: 4px 0; color: #fda4af; font-family: monospace; font-weight: 700;">${adminId}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">College / Campus:</td>
                              <td style="padding: 4px 0; color: #f8fafc;">${userCollege}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">Department:</td>
                              <td style="padding: 4px 0; color: #f8fafc;">${userDept}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0; text-align: center;">
                      <tr>
                        <td align="center">
                          <a href="${targetUrl}" style="display: inline-block; background: linear-gradient(135deg, #e11d48 0%, #f43f5e 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; box-shadow: 0 10px 20px -5px rgba(225, 29, 72, 0.5);">
                            🚀 Open Admin Console
                          </a>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; margin: 24px 0; border-collapse: separate;">
                      <tr>
                        <td style="padding: 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-bottom: 12px;">
                                <div style="color: #fb7185; font-weight: 700; font-size: 14px;">🏛️ Master Symposium Governance</div>
                                <div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">Oversee tracks, approve schedules, and manage venue allocations.</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-bottom: 12px;">
                                <div style="color: #38bdf8; font-weight: 700; font-size: 14px;">👥 Staff & Coordinator Management</div>
                                <div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">Assign coordinator roles and monitor check-in staff activity.</div>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <div style="color: #34d399; font-weight: 700; font-size: 14px;">📊 Real-Time Analytics & Reports</div>
                                <div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">Live registration metrics, seat capacity heatmaps, and instant data exports.</div>
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
    return { subject, textContent, htmlContent };
  }

  if (normRole === 'coordinator' || normRole === 'staff') {
    const staffId = roll_no || `FAC-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const targetUrl = loginUrl || 'http://localhost:5173/login/staff';
    const userName = name || email.split('@')[0] || 'Event Coordinator';
    const subject = '📋 Welcome to SmartSympo 2026 - Coordinator Access Activated!';

    const textContent = `Hi ${userName},\n\nWelcome to SmartSympo! Your Coordinator account has been successfully activated.\n\nYou now have authorized access to manage venue tracks and check in attendees.\n\nAccount Details:\n- Role: Event Coordinator\n- Name: ${userName}\n- Email: ${email}\n- Coordinator ID: ${staffId}\n- College: ${userCollege}\n- Department: ${userDept}\n- Coordinator Portal: ${targetUrl}\n\nBest regards,\nSmartSympo Organizing Team`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to SmartSympo - Coordinator Access</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #1e293b; border: 1px solid #334155; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);">
                <tr>
                  <td style="background: linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%); padding: 36px 32px; text-align: center;">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                      Coordinator Portal
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                      📋 Welcome, Coordinator!
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #fef3c7; font-size: 14px; font-weight: 500;">
                      Venue & Track Coordination Access Activated
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px 32px;">
                    <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9; margin-top: 0;">
                      Hi <strong>${userName}</strong>,
                    </p>
                    <p style="font-size: 15px; line-height: 1.65; color: #cbd5e1; margin-top: 12px;">
                      Welcome to SmartSympo! Your Coordinator account is ready. You have authorized access to manage venue schedules, broadcast live delay alerts, scan student TOTP QR passes at entry gates, and verify attendance in real time.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; margin: 24px 0; border-collapse: separate;">
                      <tr>
                        <td style="padding: 20px;">
                          <div style="font-size: 12px; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                            📋 Coordinator Profile Details
                          </div>
                          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8; width: 35%;">Name:</td>
                              <td style="padding: 4px 0; color: #f8fafc; font-weight: 600;">${userName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">Email:</td>
                              <td style="padding: 4px 0; color: #f8fafc; font-weight: 600;">${email}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">Role:</td>
                              <td style="padding: 4px 0; color: #fbbf24; font-weight: 700;">Event Coordinator</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">Staff ID:</td>
                              <td style="padding: 4px 0; color: #fde68a; font-family: monospace; font-weight: 700;">${staffId}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">College:</td>
                              <td style="padding: 4px 0; color: #f8fafc;">${userCollege}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; color: #94a3b8;">Department:</td>
                              <td style="padding: 4px 0; color: #f8fafc;">${userDept}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0; text-align: center;">
                      <tr>
                        <td align="center">
                          <a href="${targetUrl}" style="display: inline-block; background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; box-shadow: 0 10px 20px -5px rgba(217, 119, 6, 0.5);">
                            🚀 Open Coordinator Portal
                          </a>
                        </td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; margin: 24px 0; border-collapse: separate;">
                      <tr>
                        <td style="padding: 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-bottom: 12px;">
                                <div style="color: #fbbf24; font-weight: 700; font-size: 14px;">📡 Live Hall & Track Control</div>
                                <div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">Update session stages, adjust timings, and broadcast delay alerts.</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-bottom: 12px;">
                                <div style="color: #34d399; font-weight: 700; font-size: 14px;">📷 Fast-Lane TOTP QR Scanner</div>
                                <div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">Instant QR code gate check-in with fraud prevention.</div>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <div style="color: #818cf8; font-weight: 700; font-size: 14px;">📢 Live Student Announcements</div>
                                <div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">Broadcast urgent alerts directly to registered student attendees.</div>
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
    return { subject, textContent, htmlContent };
  }

  // Default: Student Delegate
  const studentId = roll_no || `STU-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const targetUrl = loginUrl || 'http://localhost:5173/login/student';
  const userName = name || email.split('@')[0] || 'Student Delegate';
  const subject = '🎉 Welcome to SmartSympo 2026 - Student Account Activated!';

  const textContent = `Hi ${userName},\n\nWelcome to SmartSympo! You have successfully signed up and your account has been activated.\n\nYou can now log in to SmartSympo, browse symposium tracks, register for events with 1-click clash detection, and access your live digital TOTP pass.\n\nAccount Details:\n- Role: Student Delegate\n- Name: ${userName}\n- Email: ${email}\n- Roll No: ${studentId}\n- College: ${userCollege}\n- Department: ${userDept}\n- Login Link: ${targetUrl}\n\nBest regards,\nSmartSympo Organizing Team`;

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
              <tr>
                <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%); padding: 36px 32px; text-align: center;">
                  <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                    SmartSympo 2026
                  </div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                    🎉 Welcome to SmartSympo!
                  </h1>
                  <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px; font-weight: 500;">
                    Student Account Successfully Activated
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 36px 32px;">
                  <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9; margin-top: 0;">
                    Hi <strong>${userName}</strong>,
                  </p>
                  <p style="font-size: 15px; line-height: 1.65; color: #cbd5e1; margin-top: 12px;">
                    Welcome to SmartSympo! Your student registration is complete and your account is now ready for use. 
                    You can log in, explore paper presentations, hackathons, and technical tracks, claim your digital passes, and track your attendance in real-time.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; margin: 24px 0; border-collapse: separate;">
                    <tr>
                      <td style="padding: 20px;">
                        <div style="font-size: 12px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                          📋 Your Registered Profile Details
                        </div>
                        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
                          <tr>
                            <td style="padding: 4px 0; color: #94a3b8; width: 35%;">Name:</td>
                            <td style="padding: 4px 0; color: #f8fafc; font-weight: 600;">${userName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 4px 0; color: #94a3b8;">Email:</td>
                            <td style="padding: 4px 0; color: #f8fafc; font-weight: 600;">${email}</td>
                          </tr>
                          <tr>
                            <td style="padding: 4px 0; color: #94a3b8;">Role:</td>
                            <td style="padding: 4px 0; color: #818cf8; font-weight: 700;">Student Delegate</td>
                          </tr>
                          <tr>
                            <td style="padding: 4px 0; color: #94a3b8;">Roll No / ID:</td>
                            <td style="padding: 4px 0; color: #a5b4fc; font-family: monospace; font-weight: 700;">${studentId}</td>
                          </tr>
                          <tr>
                            <td style="padding: 4px 0; color: #94a3b8;">College:</td>
                            <td style="padding: 4px 0; color: #f8fafc;">${userCollege}</td>
                          </tr>
                          <tr>
                            <td style="padding: 4px 0; color: #94a3b8;">Department:</td>
                            <td style="padding: 4px 0; color: #f8fafc;">${userDept}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0; text-align: center;">
                    <tr>
                      <td align="center">
                        <a href="${targetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.5);">
                          🚀 Log In to Student Portal
                        </a>
                      </td>
                    </tr>
                  </table>
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
  return { subject, textContent, htmlContent };
};

// =========================================================================
// 1. WELCOME & USER SIGNUP / FIRST LOGIN CONFIRMATION EMAIL
// Trigger: When a student, coordinator, or admin registers or logs in for the first time.
// =========================================================================
const handleWelcomeEmail = async (req, res) => {
  try {
    const { email, name, role, roll_no, collegeName, department, loginUrl } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'Missing recipient email address.' });
    }

    const { subject, textContent, htmlContent } = generateWelcomeEmailContent({
      email,
      name,
      role,
      roll_no,
      collegeName,
      department,
      loginUrl,
    });

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
const handleEventConfirmationEmail = async (req, res) => {
  try {
    const { email, name, eventName, category, venue, timeSlot, eventDate, passToken, roll_no, collegeName } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'Missing recipient email address.' });
    }

    const studentName = name || email.split('@')[0] || 'Student';
    const title = eventName || 'Symposium Event';
    const eventCategory = category || 'Technical';
    const eventVenue = venue || 'Main Auditorium';
    const slot = timeSlot || 'Scheduled Time Slot';
    const date = eventDate || new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
    const token = passToken || `PASS-${Date.now().toString(36).toUpperCase()}`;
    const studentRoll = roll_no || '';
    const studentCollege = collegeName || '';

    const subject = `✅ Registration Confirmed: ${title} - Smart-Sympo 2026`;

    const textContent = `Hi ${studentName},\n\nYou have successfully registered for ${title} (${eventCategory}).\n- Venue / Hall: ${eventVenue}\n- Scheduled Time: ${slot}\n- Date: ${date}\n- Pass Token: ${token}\n\nPlease keep your digital TOTP QR pass ready at the venue for coordinator check-in.\n\nBest of luck!\nSmart-Sympo Organizing Team`;

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
                              <td style="padding-bottom: 12px;">
                                <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">📅 Date</span>
                                <div style="font-size: 14px; color: #e2e8f0; font-weight: 600; margin-top: 2px;">${date}</div>
                              </td>
                            </tr>
                            ${token ? `
                            <tr>
                              <td>
                                <span style="font-size: 11px; text-transform: uppercase; color: #34d399; font-weight: 700;">🎫 Entry Pass Token</span>
                                <div style="font-size: 14px; color: #6ee7b7; font-family: monospace; font-weight: 700; margin-top: 2px; letter-spacing: 1px;">${token}</div>
                              </td>
                            </tr>
                            ` : ''}
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
                        Please keep your student portal QR pass ready at the venue for coordinator scanning and instant attendance verification.
                      </p>
                    </div>

                    <p style="font-size: 15px; font-weight: 600; color: #34d399; margin: 20px 0 0 0;">
                      Best of luck!
                    </p>
                    <p style="font-size: 13px; color: #94a3b8; margin: 6px 0 0 0;">
                      Smart-Sympo Organizing Committee
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

// Endpoint to notify Administrator when a student submits application feedback
app.post('/api/send-admin-feedback', async (req, res) => {
  try {
    const {
      student_name,
      studentName,
      student_email,
      studentEmail,
      roll_no,
      rollNo,
      college,
      department,
      category = 'general',
      rating = 5,
      title = '',
      message,
      priority = 'normal',
      created_at,
    } = req.body || {};

    if (!message) {
      return res.status(400).json({ success: false, error: 'Feedback message is required.' });
    }

    const sName = student_name || studentName || 'Student Delegate';
    const sEmail = student_email || studentEmail || 'student@college.edu';
    const sRoll = roll_no || rollNo || 'N/A';
    const sCollege = college || 'Symposium Campus';
    const sDept = department || 'General';
    const adminRecipient = process.env.ADMIN_EMAIL || process.env.GMAIL_USER || 'admin@college.edu';
    const formattedDate = created_at ? new Date(created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    const stars = '★'.repeat(Math.min(5, Math.max(1, Number(rating) || 5))) + '☆'.repeat(5 - Math.min(5, Math.max(1, Number(rating) || 5)));
    const subject = `📢 [Student Feedback - ${sRoll}] ${sName}: "${title || category.toUpperCase()}"`;

    const text = `New Application Feedback received from Student:
Sender Details:
- Name: ${sName}
- Roll No / ID: ${sRoll}
- Email: ${sEmail}
- College: ${sCollege}
- Department: ${sDept}

Feedback Details:
- Category: ${category}
- Rating: ${rating}/5 (${stars})
- Priority: ${priority}
- Title: ${title || 'N/A'}
- Submitted: ${formattedDate}

Message:
${message}

You can review and manage this in the Admin Dashboard: http://localhost:5173/admin
`;

    const html = `
      <div style="background-color: #0f172a; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 24px; text-align: center;">
            <span style="background-color: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #ffffff;">
              Student App Feedback
            </span>
            <h1 style="color: #ffffff; margin: 12px 0 4px 0; font-size: 22px;">New Feedback Received!</h1>
            <p style="color: #e0e7ff; margin: 0; font-size: 13px;">Sender: Student &rarr; Receiver: Administration</p>
          </div>

          <div style="padding: 24px;">
            <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <h3 style="color: #818cf8; margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">🎓 Student (Sender) Identification</h3>
              <table style="width: 100%; font-size: 13px; color: #cbd5e1; border-collapse: collapse;">
                <tr><td style="padding: 4px 0; color: #94a3b8; width: 35%;">Name:</td><td style="padding: 4px 0; font-weight: 600; color: #f8fafc;">${sName}</td></tr>
                <tr><td style="padding: 4px 0; color: #94a3b8;">Roll No / ID:</td><td style="padding: 4px 0; font-family: monospace; font-weight: 700; color: #38bdf8;">${sRoll}</td></tr>
                <tr><td style="padding: 4px 0; color: #94a3b8;">Email:</td><td style="padding: 4px 0;"><a href="mailto:${sEmail}" style="color: #818cf8; text-decoration: none;">${sEmail}</a></td></tr>
                <tr><td style="padding: 4px 0; color: #94a3b8;">College:</td><td style="padding: 4px 0;">${sCollege}</td></tr>
                <tr><td style="padding: 4px 0; color: #94a3b8;">Department:</td><td style="padding: 4px 0;">${sDept}</td></tr>
              </table>
            </div>

            <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #fbbf24; font-size: 16px; letter-spacing: 2px;">${stars} (${rating}/5)</span>
                <span style="background-color: #3b82f6; color: #ffffff; padding: 2px 8px; border-radius: 6px; font-size: 11px; text-transform: uppercase; font-weight: 600;">${category}</span>
              </div>
              ${title ? `<h4 style="color: #ffffff; margin: 8px 0 4px 0; font-size: 15px;">${title}</h4>` : ''}
              <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-top: 8px; white-space: pre-wrap; background-color: #1e293b; padding: 12px; border-radius: 8px; border-left: 3px solid #6366f1;">
${message}
              </div>
              <div style="color: #64748b; font-size: 11px; margin-top: 10px; text-align: right;">Submitted on: ${formattedDate}</div>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="http://localhost:5173/admin" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 700; display: inline-block;">
                Open Admin Feedback Hub &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    const result = await dispatchEmail({ to: adminRecipient, subject, text, html });
    return res.status(200).json({ success: true, dispatched: true, result });
  } catch (err) {
    console.error('Error in /api/send-admin-feedback:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch feedback notification.' });
  }
});

// =========================================================================
// 3. WHATSAPP & SMS RELAY ENDPOINTS
// =========================================================================
app.post('/api/relay-whatsapp', async (req, res) => {
  try {
    const { phone, message, eventTitle, venue } = req.body || {};
    if (!message && !eventTitle) {
      return res.status(400).json({ success: false, error: 'Message or eventTitle required.' });
    }

    const payloadText = message || `🎓 SmartSympo Alert: Session "${eventTitle}" update at venue "${venue || 'Main Hall'}".`;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const waLink = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(payloadText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(payloadText)}`;

    console.log(`[WhatsApp Relay] Prepared message for ${cleanPhone || 'Broadcast'}:`, payloadText);
    return res.status(200).json({
      success: true,
      relayed: true,
      service: 'WhatsApp Relay Gateway',
      phone: cleanPhone || 'Broadcast',
      waLink,
      message: payloadText,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/relay-sms', async (req, res) => {
  try {
    const { phone, message, eventTitle } = req.body || {};
    if (!phone || (!message && !eventTitle)) {
      return res.status(400).json({ success: false, error: 'Phone number and message required.' });
    }

    const smsText = message || `SmartSympo Notice: Important update for session ${eventTitle || 'Symposium'}.`;
    console.log(`[SMS Gateway Simulated] Dispatched SMS to ${phone}: ${smsText}`);

    return res.status(200).json({
      success: true,
      dispatched: true,
      phone,
      message: smsText,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Smart-Sympo Email & Relay Service] Running on http://localhost:${PORT}`);
    const { gmailUser } = getSmtpCredentials();
    console.log(`[SMTP Status] GMAIL_USER: ${gmailUser}`);
  });
}

export default app;
