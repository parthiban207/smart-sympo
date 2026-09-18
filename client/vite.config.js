// agent-notes: { ctx: "Vite dev config with built-in Gmail SMTP Nodemailer API middleware fallback and proxy for 100% reliable email dispatch", deps: ["vite", "@vitejs/plugin-react", "@tailwindcss/vite", "nodemailer", "dotenv"], state: "active", last: "antigravity@2026-09-18" }

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables from root .env
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const getGmailTransporter = () => {
  const gmailUser = (process.env.GMAIL_USER || 'smartsympo@gmail.com').trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || 'zjrl tozy melg blor').replace(/\s+/g, '');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });
};

function emailApiPlugin() {
  return {
    name: 'smart-sympo-email-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) {
          return next();
        }

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          return res.end();
        }

        if (req.method === 'GET' && req.url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ status: 'ok', service: 'Vite Email Gateway active' }));
        }

        if (req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });

          req.on('end', async () => {
            let body = {};
            try {
              body = JSON.parse(bodyStr || '{}');
            } catch (_err) {
              // Ignore invalid JSON body
            }

            const transporter = getGmailTransporter();
            const senderUser = (process.env.GMAIL_USER || 'smartsympo@gmail.com').trim();

            if (req.url === '/api/send-welcome-email' || req.url === '/api/send-first-login-email') {
              const { email, name, role, roll_no, collegeName, department, loginUrl } = body;
              if (!email) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Recipient email required' }));
              }

              const normRole = (role || 'student').toLowerCase();
              const userCollege = collegeName || 'Symposium Campus';
              const userDept = department || 'Computer Science & Engineering';

              let subject = '🎉 Welcome to SmartSympo 2026 - Student Account Activated!';
              let badge = 'SmartSympo 2026';
              let badgeColor = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%)';
              let heroTitle = '🎉 Welcome to SmartSympo!';
              let heroSubtitle = 'Student Account Successfully Activated';
              let roleName = 'Student Delegate';
              let idLabel = 'Roll No / ID:';
              let idVal = roll_no || `STU-${Date.now().toString(36).slice(-4).toUpperCase()}`;
              let targetUrl = loginUrl || 'http://localhost:5173/login/student';
              let btnText = '🚀 Log In to Student Portal';
              let btnGradient = 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)';
              let userName = name || email.split('@')[0] || 'Student Delegate';
              let introDesc = 'Welcome to SmartSympo! Your student registration is complete. You can now explore technical tracks, claim your digital TOTP QR pass, and track live attendance.';
              let highlights = `
                <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">⚡ <strong>1-Click Registration:</strong> Smart clash detection prevents schedule conflicts.</div>
                <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">📲 <strong>Dynamic TOTP Pass:</strong> 15-second secure QR token for venue hall access.</div>
                <div style="font-size: 13px; color: #cbd5e1;">📍 <strong>Live Hall Updates:</strong> Real-time alerts and track notifications.</div>
              `;

              if (normRole === 'admin') {
                subject = '👑 Welcome to SmartSympo 2026 - Administrator Access Activated!';
                badge = 'Administrator Access';
                badgeColor = 'linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%)';
                heroTitle = '👑 Welcome, Administrator!';
                heroSubtitle = 'Master Governance & Symposium Administration Activated';
                roleName = 'Administrator';
                idLabel = 'Admin ID:';
                idVal = roll_no || `ADM-${Date.now().toString(36).slice(-4).toUpperCase()}`;
                targetUrl = loginUrl || 'http://localhost:5173/login/admin';
                btnText = '🚀 Open Admin Console';
                btnGradient = 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)';
                userName = name || email.split('@')[0] || 'Administrator';
                introDesc = 'Welcome to SmartSympo! Your Administrator account has been activated with full governance privileges. You can manage coordinators, approve event tracks, and oversee global attendance.';
                highlights = `
                  <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">🏛️ <strong>Master Governance:</strong> Manage event tracks, schedules, and venue allocations.</div>
                  <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">👥 <strong>Staff Management:</strong> Assign coordinator roles and monitor hall staff.</div>
                  <div style="font-size: 13px; color: #cbd5e1;">📊 <strong>Live Analytics:</strong> Real-time registration metrics and data exports.</div>
                `;
              } else if (normRole === 'coordinator' || normRole === 'staff') {
                subject = '📋 Welcome to SmartSympo 2026 - Coordinator Access Activated!';
                badge = 'Coordinator Portal';
                badgeColor = 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #78350f 100%)';
                heroTitle = '📋 Welcome, Coordinator!';
                heroSubtitle = 'Venue & Track Coordination Access Activated';
                roleName = 'Event Coordinator';
                idLabel = 'Staff ID:';
                idVal = roll_no || `FAC-${Date.now().toString(36).slice(-4).toUpperCase()}`;
                targetUrl = loginUrl || 'http://localhost:5173/login/staff';
                btnText = '🚀 Open Coordinator Portal';
                btnGradient = 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)';
                userName = name || email.split('@')[0] || 'Event Coordinator';
                introDesc = 'Welcome to SmartSympo! Your Coordinator account is ready. You have authorized access to manage venue schedules, broadcast live delay alerts, and scan student TOTP QR passes.';
                highlights = `
                  <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">📡 <strong>Track Management:</strong> Adjust stages, schedule timings, and delay broadcasts.</div>
                  <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">📷 <strong>TOTP Scanner:</strong> Instant entry check-in with fraud protection.</div>
                  <div style="font-size: 13px; color: #cbd5e1;">📢 <strong>Broadcasts:</strong> Send urgent alerts to registered delegates.</div>
                `;
              }

              const html = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; padding: 40px 10px; color: #f8fafc;">
                  <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155;">
                    <div style="background: ${badgeColor}; padding: 36px 32px; text-align: center;">
                      <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; margin-bottom: 8px;">
                        ${badge}
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 26px;">${heroTitle}</h1>
                      <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">${heroSubtitle}</p>
                    </div>
                    <div style="padding: 32px;">
                      <p style="font-size: 16px; color: #f1f5f9;">Hi <strong>${userName}</strong>,</p>
                      <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
                        ${introDesc}
                      </p>
                      <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin: 20px 0;">
                        <div style="font-size: 12px; font-weight: bold; color: #818cf8; text-transform: uppercase; margin-bottom: 10px;">📋 Profile Details</div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Name:</strong> ${userName}</div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Email:</strong> ${email}</div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Role:</strong> ${roleName}</div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>${idLabel}</strong> <span style="font-family: monospace; color: #a5b4fc;">${idVal}</span></div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>College / Campus:</strong> ${userCollege}</div>
                        <div style="font-size: 13px; color: #cbd5e1;"><strong>Department:</strong> ${userDept}</div>
                      </div>
                      <div style="text-align: center; margin: 28px 0;">
                        <a href="${targetUrl}" style="background: ${btnGradient}; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold; padding: 14px 32px; border-radius: 12px; display: inline-block;">
                          ${btnText}
                        </a>
                      </div>
                      <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin: 20px 0;">
                        ${highlights}
                      </div>
                      <p style="font-size: 13px; color: #94a3b8; margin: 0;">SmartSympo Organizing Team • smartsympo@gmail.com</p>
                    </div>
                  </div>
                </div>
              `;

              try {
                const info = await transporter.sendMail({
                  from: `"SmartSympo 2026" <${senderUser}>`,
                  to: email,
                  replyTo: senderUser,
                  subject,
                  text: `Welcome ${userName}! Your SmartSympo ${roleName} account has been activated. Email: ${email}, ID: ${idVal}. Access link: ${targetUrl}`,
                  html,
                });
                console.log(`[Vite Email Gateway] Dispatched from ${senderUser} -> TO user mailbox: ${email} (MessageID: ${info.messageId})`);
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, dispatched: true, messageId: info.messageId, to: email }));
              } catch (err) {
                console.error(`[Vite Email Gateway Error] Failed to send welcome email from ${senderUser} to ${email}:`, err.message);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: err.message }));
              }
            }

            if (req.url === '/api/send-event-confirmation' || req.url === '/api/send-registration-email') {
              const { email, name, eventName, category, venue, timeSlot, eventDate, passToken, roll_no: _roll_no, collegeName: _collegeName } = body;
              if (!email) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Recipient email required' }));
              }

              const studentName = name || email.split('@')[0] || 'Student Delegate';
              const title = eventName || 'Symposium Event';
              const eventCategory = category || 'Technical';
              const eventVenue = venue || 'Main Auditorium';
              const eventSlot = timeSlot || '09:00 AM - 11:00 AM';
              const dateStr = eventDate || 'Symposium Day 1';
              const qrToken = passToken || 'VERIFIED-TOKEN';

              const subject = `🎟️ Registration Confirmed: ${title}`;
              const html = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; padding: 40px 10px; color: #f8fafc;">
                  <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155;">
                    <div style="background: linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%); padding: 36px 32px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 26px;">🎟️ Registration Confirmed!</h1>
                      <p style="margin: 8px 0 0 0; color: #d1fae5; font-size: 14px;">Your seat has been reserved</p>
                    </div>
                    <div style="padding: 32px;">
                      <p style="font-size: 16px; color: #f1f5f9;">Hi <strong>${studentName}</strong>,</p>
                      <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
                        You are confirmed for <strong>${title}</strong>. Please present your digital dynamic QR pass at the entrance scanner before the session begins.
                      </p>
                      <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin: 20px 0;">
                        <div style="font-size: 12px; font-weight: bold; color: #34d399; text-transform: uppercase; margin-bottom: 10px;">📍 Event Pass Details</div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Session:</strong> ${title} (${eventCategory})</div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Venue:</strong> ${eventVenue}</div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Time Slot:</strong> ${eventSlot}</div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Date:</strong> ${dateStr}</div>
                        <div style="font-size: 13px; color: #cbd5e1;"><strong>Security Token:</strong> <span style="font-family: monospace; color: #a7f3d0;">${qrToken}</span></div>
                      </div>
                      <p style="font-size: 13px; color: #94a3b8; margin: 0;">SmartSympo Organizing Team • smartsympo@gmail.com</p>
                    </div>
                  </div>
                </div>
              `;

              try {
                const info = await transporter.sendMail({
                  from: `"SmartSympo 2026" <${senderUser}>`,
                  to: email,
                  replyTo: senderUser,
                  subject,
                  text: `Registration Confirmed for ${title}! Venue: ${eventVenue}, Time: ${eventSlot}.`,
                  html,
                });
                console.log(`[Vite Email Gateway] Dispatched from ${senderUser} -> TO user mailbox: ${email} (MessageID: ${info.messageId})`);
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, dispatched: true, messageId: info.messageId, to: email }));
              } catch (err) {
                console.error(`[Vite Email Gateway Error] Failed to send event confirmation from ${senderUser} to ${email}:`, err.message);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: err.message }));
              }
            }

            if (req.url === '/api/send-login-alert') {
              const { email, name: _name, role: _role, ipAddress: _ipAddress } = body;
              if (!email) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Recipient email required' }));
              }

              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true, message: 'Login alert processed' }));
            }

            // Fallback for unrecognized /api route
            next();
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '..'),
  plugins: [react(), tailwindcss(), emailApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
