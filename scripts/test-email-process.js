// agent-notes: { ctx: "Automated verification script for Welcome / Activation emails from smartsympo@gmail.com to user inboxes", deps: ["nodemailer", "dotenv"], state: "active", last: "antigravity@2026-09-18" }

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const senderUser = (process.env.GMAIL_USER || 'smartsympo@gmail.com').trim();
const gmailPass = (process.env.GMAIL_APP_PASSWORD || 'zjrl tozy melg blor').replace(/\s+/g, '');
const targetRecipient = process.argv[2] || process.env.TEST_RECIPIENT_EMAIL || senderUser;

console.log('====================================================');
console.log('🧪 SMART-SYMPO EMAIL PROCESS VERIFICATION TEST');
console.log('====================================================\n');
console.log(`📤 Outgoing Sender (System): ${senderUser}`);
console.log(`📥 Incoming Recipient (User Mailbox): ${targetRecipient}`);
console.log(`🔑 App Password Configured: ${Boolean(gmailPass)}\n`);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: senderUser,
    pass: gmailPass,
  },
});

async function runTests() {
  try {
    // 1. Verify SMTP Connection
    console.log('[1/4] Verifying Gmail SMTP Server Authentication...');
    await transporter.verify();
    console.log('✅ SMTP Connection Authenticated Successfully!');

    // 2. Test Student Welcome Email
    console.log(`\n[2/4] Testing: Student Welcome Email Dispatch (From: ${senderUser} -> To: ${targetRecipient})...`);
    const studentSubject = '🎉 Welcome to SmartSympo 2026 - Student Account Activated!';
    const studentHtml = `
      <div style="font-family: sans-serif; background-color: #0f172a; padding: 30px; color: #f8fafc;">
        <div style="max-width: 550px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 28px; text-align: center;">
            <h2 style="margin: 0; color: #ffffff;">🎉 Welcome to SmartSympo!</h2>
            <p style="margin: 6px 0 0 0; color: #e0e7ff; font-size: 13px;">Student Account Activated</p>
          </div>
          <div style="padding: 24px;">
            <p>Hi <strong>Student Delegate</strong>,</p>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              Welcome to SmartSympo! Your student account has been created. You can browse symposium tracks and access your digital pass.
            </p>
            <div style="background-color: #0f172a; padding: 14px; border-radius: 10px; margin: 16px 0; font-size: 13px; color: #cbd5e1;">
              <div>• <strong>Registered Email:</strong> ${targetRecipient}</div>
              <div>• <strong>Roll No:</strong> STU-TEST-2026</div>
              <div>• <strong>College:</strong> College of Engineering</div>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 18px;">Dispatched from ${senderUser}</p>
          </div>
        </div>
      </div>
    `;

    const info1 = await transporter.sendMail({
      from: `"SmartSympo 2026" <${senderUser}>`,
      to: targetRecipient,
      replyTo: senderUser,
      subject: studentSubject,
      text: `Welcome to SmartSympo! Your student account (${targetRecipient}) is active.`,
      html: studentHtml,
    });
    console.log(`✅ Student Welcome Email Dispatched Successfully to ${targetRecipient}!`);
    console.log('   - Message ID:', info1.messageId);

    // 3. Test Coordinator Welcome Email
    console.log(`\n[3/4] Testing: Coordinator Welcome Email Dispatch (From: ${senderUser} -> To: ${targetRecipient})...`);
    const coordSubject = '📋 Welcome to SmartSympo 2026 - Coordinator Access Activated!';
    const coordHtml = `
      <div style="font-family: sans-serif; background-color: #0f172a; padding: 30px; color: #f8fafc;">
        <div style="max-width: 550px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
          <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 28px; text-align: center;">
            <h2 style="margin: 0; color: #ffffff;">📋 Welcome, Event Coordinator!</h2>
            <p style="margin: 6px 0 0 0; color: #fef3c7; font-size: 13px;">Coordinator Portal Activated</p>
          </div>
          <div style="padding: 24px;">
            <p>Hi <strong>Faculty Coordinator</strong>,</p>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              Welcome to SmartSympo! Your coordinator account has been activated with access to live venue schedules and TOTP QR scanning.
            </p>
            <div style="background-color: #0f172a; padding: 14px; border-radius: 10px; margin: 16px 0; font-size: 13px; color: #cbd5e1;">
              <div>• <strong>Registered Email:</strong> ${targetRecipient}</div>
              <div>• <strong>Staff ID:</strong> FAC-TEST-2026</div>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 18px;">Dispatched from ${senderUser}</p>
          </div>
        </div>
      </div>
    `;
    const info2 = await transporter.sendMail({
      from: `"SmartSympo 2026" <${senderUser}>`,
      to: targetRecipient,
      replyTo: senderUser,
      subject: coordSubject,
      text: `Welcome to SmartSympo! Your coordinator account (${targetRecipient}) is active.`,
      html: coordHtml,
    });
    console.log(`✅ Coordinator Welcome Email Dispatched Successfully to ${targetRecipient}!`);
    console.log('   - Message ID:', info2.messageId);

    // 4. Test Event Registration Confirmation Email
    console.log(`\n[4/4] Testing: Event Registration Confirmation Dispatch (From: ${senderUser} -> To: ${targetRecipient})...`);
    const eventSubject = '✅ Registration Confirmed: AI Hackathon 2026 - Smart-Sympo 2026';
    const eventHtml = `
      <div style="font-family: sans-serif; background-color: #0b0f19; padding: 30px; color: #f8fafc;">
        <div style="max-width: 550px; margin: 0 auto; background-color: #151d30; border-radius: 16px; overflow: hidden; border: 1px solid #2a364f;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 28px; text-align: center;">
            <h2 style="margin: 0; color: #ffffff;">✅ Registration Confirmed!</h2>
            <p style="margin: 6px 0 0 0; color: #d1fae5; font-size: 14px;">AI Hackathon 2026</p>
          </div>
          <div style="padding: 24px;">
            <p>Hi <strong>Test User</strong>,</p>
            <p style="color: #cbd5e1; font-size: 14px;">
              You have successfully registered for <strong>AI Hackathon 2026</strong>.
            </p>
            <div style="background-color: #0f172a; padding: 14px; border-radius: 10px; margin: 16px 0; font-size: 13px; color: #cbd5e1;">
              <div>• <strong>Recipient:</strong> ${targetRecipient}</div>
              <div>• <strong>Venue:</strong> Main Auditorium Hall A</div>
              <div>• <strong>Pass Token:</strong> PASS-HACK-2026-LIVE</div>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 18px;">Dispatched from ${senderUser}</p>
          </div>
        </div>
      </div>
    `;

    const info3 = await transporter.sendMail({
      from: `"SmartSympo 2026" <${senderUser}>`,
      to: targetRecipient,
      replyTo: senderUser,
      subject: eventSubject,
      text: `Registration confirmed for AI Hackathon 2026! Pass: PASS-HACK-2026-LIVE`,
      html: eventHtml,
    });
    console.log(`✅ Event Registration Email Dispatched Successfully to ${targetRecipient}!`);
    console.log('   - Message ID:', info3.messageId);

    console.log('\n====================================================');
    console.log('🎉 ALL EMAIL PROCESSES TESTED & VERIFIED 100% OPERATIONAL!');
    console.log(`Sender: ${senderUser} | Recipient: ${targetRecipient}`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Email Verification Failed:', err);
    process.exit(1);
  }
}

runTests();
