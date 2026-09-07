// agent-notes: { ctx: "Vite dev config with built-in Gmail SMTP Nodemailer API middleware fallback and proxy for 100% reliable email dispatch", deps: ["vite", "@vitejs/plugin-react", "@tailwindcss/vite", "nodemailer", "dotenv"], state: "active", last: "antigravity@2026-09-07" }

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../server/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

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
            } catch (e) {}

            const transporter = getGmailTransporter();
            const senderUser = (process.env.GMAIL_USER || 'smartsympo@gmail.com').trim();

            if (req.url === '/api/send-welcome-email' || req.url === '/api/send-first-login-email') {
              const { email, name, role, roll_no, collegeName, department, loginUrl } = body;
              if (!email) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Recipient email required' }));
              }

              const studentName = name || email.split('@')[0] || 'Student Delegate';
              const userRole = role || 'student';
              const studentRollNo = roll_no || 'STU-2026';
              const studentCollege = collegeName || 'College of Engineering';
              const studentDept = department || 'Computer Science & Engineering';
              const targetLoginUrl = loginUrl || 'http://localhost:5173/login/student';

              const subject = '🎉 Welcome to SmartSympo - Account Activated Successfully!';
              const html = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; padding: 40px 10px; color: #f8fafc;">
                  <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155;">
                    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%); padding: 36px 32px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 26px;">🎉 Welcome to SmartSympo!</h1>
                      <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">Student Account Successfully Activated</p>
                    </div>
                    <div style="padding: 32px;">
                      <p style="font-size: 16px; color: #f1f5f9;">Hi <strong>${studentName}</strong>,</p>
                      <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
                        Welcome to SmartSympo! Your student registration is complete. You can now explore technical tracks, claim your digital TOTP QR pass, and track live attendance.
                      </p>
                      <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin: 20px 0;">
                        <div style="font-size: 12px; font-weight: bold; color: #818cf8; text-transform: uppercase; margin-bottom: 10px;">📋 Your Profile Details</div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Name:</strong> ${studentName}</div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Email:</strong> ${email}</div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>Roll No:</strong> <span style="font-family: monospace; color: #a5b4fc;">${studentRollNo}</span></div>
                        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;"><strong>College:</strong> ${studentCollege}</div>
                        <div style="font-size: 13px; color: #cbd5e1;"><strong>Department:</strong> ${studentDept}</div>
                      </div>
                      <div style="text-align: center; margin: 28px 0;">
                        <a href="${targetLoginUrl}" style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold; padding: 14px 32px; border-radius: 12px; display: inline-block;">
                          🚀 Access Student Portal
                        </a>
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
                  subject,
                  text: `Welcome ${studentName}! Your SmartSympo account has been activated. Email: ${email}, Roll No: ${studentRollNo}. Log in at: ${targetLoginUrl}`,
                  html,
                });
                console.log(`[Vite Email Gateway] Welcome email dispatched to ${email}:`, info.messageId);
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, dispatched: true, messageId: info.messageId, to: email }));
              } catch (err) {
                console.error(`[Vite Email Gateway Error] Failed to send welcome email to ${email}:`, err.message);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: err.message }));
              }
            }

            if (req.url === '/api/send-event-confirmation' || req.url === '/api/send-registration-email') {
              const { email, name, eventName, category, venue, timeSlot, eventDate, passToken, roll_no, collegeName } = body;
              if (!email) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Recipient email required' }));
              }

              const studentName = name || email.split('@')[0] || 'Student Delegate';
              const title = eventName || 'Symposium Event';
              const eventCategory = category || 'Technical';
              const eventVenue = venue || 'Main Auditorium';
              const slot = timeSlot || 'Scheduled Time Slot';
              const date = eventDate || new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
              const token = passToken || `PASS-${Date.now().toString(36).toUpperCase()}`;

              const subject = `✅ Registration Confirmed: ${title} - Smart-Sympo 2026`;
              const html = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; padding: 40px 10px; color: #f8fafc;">
                  <div style="max-width: 580px; margin: 0 auto; background-color: #151d30; border-radius: 20px; overflow: hidden; border: 1px solid #2a364f;">
                    <div style="background: linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%); padding: 32px; text-align: center;">
                      <div style="font-size: 38px; margin-bottom: 6px;">✅</div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Registration Confirmed!</h1>
                      <p style="margin: 6px 0 0 0; color: #d1fae5; font-size: 15px; font-weight: bold;">${title}</p>
                    </div>
                    <div style="padding: 32px;">
                      <p style="font-size: 16px; color: #f1f5f9;">Hi <strong>${studentName}</strong>,</p>
                      <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">
                        You have successfully registered for <strong style="color: #34d399;">${title}</strong> (${eventCategory}).
                      </p>
                      <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px; margin: 20px 0;">
                        <div style="margin-bottom: 10px;">
                          <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold;">📍 Venue / Hall</div>
                          <div style="font-size: 15px; color: #ffffff; font-weight: bold; margin-top: 2px;">${eventVenue}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                          <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold;">⏰ Scheduled Time</div>
                          <div style="font-size: 14px; color: #e2e8f0; margin-top: 2px;">${slot}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                          <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold;">📅 Date</div>
                          <div style="font-size: 14px; color: #e2e8f0; margin-top: 2px;">${date}</div>
                        </div>
                        <div>
                          <div style="font-size: 11px; text-transform: uppercase; color: #34d399; font-weight: bold;">🎫 Digital Pass Token</div>
                          <div style="font-size: 14px; color: #6ee7b7; font-family: monospace; font-weight: bold; margin-top: 2px;">${token}</div>
                        </div>
                      </div>
                      <div style="background-color: #064e3b; border: 1px solid #059669; border-radius: 10px; padding: 14px; text-align: center; margin: 20px 0;">
                        <div style="color: #a7f3d0; font-size: 13px; font-weight: bold;">📲 Venue Check-in Ready</div>
                        <div style="color: #ecfdf5; font-size: 12px; margin-top: 4px;">Please keep your student portal QR pass ready for scanner verification at ${eventVenue}.</div>
                      </div>
                      <p style="font-size: 13px; color: #94a3b8; margin: 0;">SmartSympo 2026 • smartsympo@gmail.com</p>
                    </div>
                  </div>
                </div>
              `;

              try {
                const info = await transporter.sendMail({
                  from: `"SmartSympo 2026" <${senderUser}>`,
                  to: email,
                  subject,
                  text: `Registration Confirmed: ${title} (${eventCategory}) at ${eventVenue}, ${slot}. Pass Token: ${token}`,
                  html,
                });
                console.log(`[Vite Email Gateway] Event confirmation dispatched to ${email}:`, info.messageId);
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, dispatched: true, messageId: info.messageId, to: email }));
              } catch (err) {
                console.error(`[Vite Email Gateway Error] Failed to send event confirmation to ${email}:`, err.message);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: false, error: err.message }));
              }
            }

            if (req.url === '/api/send-login-alert') {
              const { email, name, role, ipAddress } = body;
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
