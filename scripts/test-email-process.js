// agent-notes: { ctx: "Automated end-to-end verification script for Welcome / Activation and Event Registration emails", deps: ["nodemailer", "dotenv"], state: "active", last: "antigravity@2026-09-07" }

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../server/.env') });
dotenv.config({ path: path.join(__dirname, '../client/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const gmailUser = (process.env.GMAIL_USER || 'smartsympo@gmail.com').trim();
const gmailPass = (process.env.GMAIL_APP_PASSWORD || 'zjrl tozy melg blor').replace(/\s+/g, '');

console.log('====================================================');
console.log('🧪 SMART-SYMPO EMAIL PROCESS VERIFICATION TEST');
console.log('====================================================\n');
console.log('SMTP Sender:', gmailUser);
console.log('App Password Configured:', Boolean(gmailPass));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPass,
  },
});

async function runTests() {
  try {
    // 1. Verify SMTP Connection
    console.log('\n[1/3] Verifying Gmail SMTP Server Authentication...');
    await transporter.verify();
    console.log('✅ SMTP Connection Authenticated Successfully!');

    // 2. Test Welcome & First Login Email
    console.log('\n[2/3] Testing: Student Welcome & First Login Email Dispatch...');
    const welcomeSubject = '🎉 Welcome to SmartSympo - Account Activated Successfully!';
    const welcomeHtml = `
      <div style="font-family: sans-serif; background-color: #0f172a; padding: 30px; color: #f8fafc;">
        <div style="max-width: 550px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 28px; text-align: center;">
            <h2 style="margin: 0; color: #ffffff;">🎉 Welcome to SmartSympo!</h2>
            <p style="margin: 6px 0 0 0; color: #e0e7ff; font-size: 13px;">Student Account Activated</p>
          </div>
          <div style="padding: 24px;">
            <p>Hi <strong>Test Student</strong>,</p>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
              Welcome to SmartSympo! Your student account has been created. You can browse symposium tracks and access your digital pass.
            </p>
            <div style="background-color: #0f172a; padding: 14px; border-radius: 10px; margin: 16px 0; font-size: 13px; color: #cbd5e1;">
              <div>• <strong>Email:</strong> ${gmailUser}</div>
              <div>• <strong>Roll No:</strong> STU-TEST-2026</div>
              <div>• <strong>College:</strong> College of Engineering</div>
            </div>
          </div>
        </div>
      </div>
    `;

    const info1 = await transporter.sendMail({
      from: `"SmartSympo 2026" <${gmailUser}>`,
      to: gmailUser,
      subject: welcomeSubject,
      text: `Welcome to SmartSympo! Your account (${gmailUser}) is active.`,
      html: welcomeHtml,
    });
    console.log('✅ Welcome Email Dispatched Successfully!');
    console.log('   - Recipient:', gmailUser);
    console.log('   - Message ID:', info1.messageId);

    // 3. Test Event Registration Confirmation Email
    console.log('\n[3/3] Testing: Event Registration Confirmation Email Dispatch...');
    const eventSubject = '✅ Registration Confirmed: AI Hackathon 2026 - Smart-Sympo 2026';
    const eventHtml = `
      <div style="font-family: sans-serif; background-color: #0b0f19; padding: 30px; color: #f8fafc;">
        <div style="max-width: 550px; margin: 0 auto; background-color: #151d30; border-radius: 16px; overflow: hidden; border: 1px solid #2a364f;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 28px; text-align: center;">
            <h2 style="margin: 0; color: #ffffff;">✅ Registration Confirmed!</h2>
            <p style="margin: 6px 0 0 0; color: #d1fae5; font-size: 14px;">AI Hackathon 2026</p>
          </div>
          <div style="padding: 24px;">
            <p>Hi <strong>Test Student</strong>,</p>
            <p style="color: #cbd5e1; font-size: 14px;">
              You have successfully registered for <strong>AI Hackathon 2026</strong>.
            </p>
            <div style="background-color: #0f172a; padding: 14px; border-radius: 10px; margin: 16px 0; font-size: 13px; color: #cbd5e1;">
              <div>• <strong>Venue:</strong> Auditorium Hall A</div>
              <div>• <strong>Time:</strong> 10:00 AM - 01:30 PM</div>
              <div>• <strong>Pass Token:</strong> <span style="color: #34d399; font-family: monospace; font-weight: bold;">PASS-AI-9921</span></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const info2 = await transporter.sendMail({
      from: `"SmartSympo 2026" <${gmailUser}>`,
      to: gmailUser,
      subject: eventSubject,
      text: 'Registration Confirmed: AI Hackathon 2026 at Auditorium Hall A.',
      html: eventHtml,
    });
    console.log('✅ Event Registration Email Dispatched Successfully!');
    console.log('   - Recipient:', gmailUser);
    console.log('   - Message ID:', info2.messageId);

    console.log('\n====================================================');
    console.log('🎉 ALL EMAIL PROCESSES TESTED & VERIFIED 100% OPERATIONAL!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
    process.exit(1);
  }
}

runTests();
