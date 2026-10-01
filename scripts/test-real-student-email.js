// agent-notes: { ctx: "Production diagnostic test tool: sends live test emails to any specified real student email address", deps: ["nodemailer", "dotenv"], state: "active", last: "antigravity@2026-10-01" }

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import welcomeHandler from '../api/send-welcome-email.js';
import eventHandler from '../api/send-event-confirmation.js';
import attendanceHandler from '../api/send-attendance-email.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    jsonData: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

async function main() {
  const targetEmail = process.argv[2] || process.env.TARGET_STUDENT_EMAIL || 'smartsympo@gmail.com';

  console.log('====================================================');
  console.log('📬 REAL STUDENT RECIPIENT EMAIL DISPATCH TEST');
  console.log('====================================================');
  console.log(`📤 System Sender:    ${process.env.GMAIL_USER || 'smartsympo@gmail.com'}`);
  console.log(`📥 Target Recipient: ${targetEmail}`);
  console.log('====================================================\n');

  // Test 1: Welcome Email
  console.log(`[1/3] Dispatching Welcome Email to: ${targetEmail}...`);
  const req1 = {
    method: 'POST',
    body: {
      email: targetEmail,
      name: 'Sample Delegate',
      role: 'student',
      roll_no: '22CS999',
      collegeName: 'National Engineering College',
      department: 'Computer Science',
    },
  };
  const res1 = createMockRes();
  await welcomeHandler(req1, res1);
  console.log(`  Status: ${res1.statusCode} | Result:`, res1.jsonData);

  // Test 2: Event Registration Email
  console.log(`\n[2/3] Dispatching Event Registration Email to: ${targetEmail}...`);
  const req2 = {
    method: 'POST',
    body: {
      email: targetEmail,
      name: 'Sample Delegate',
      eventName: 'AI/ML Coding Marathon 2026',
      category: 'Technical Hackathon',
      venue: 'Auditorium 2',
      timeSlot: '09:30 AM - 12:30 PM',
      eventDate: 'October 15, 2026',
      passToken: 'PASS-TEST-999',
      roll_no: '22CS999',
      collegeName: 'National Engineering College',
    },
  };
  const res2 = createMockRes();
  await eventHandler(req2, res2);
  console.log(`  Status: ${res2.statusCode} | Result:`, res2.jsonData);

  // Test 3: Attendance Confirmation Email
  console.log(`\n[3/3] Dispatching Attendance Confirmation Email to: ${targetEmail}...`);
  const req3 = {
    method: 'POST',
    body: {
      email: targetEmail,
      studentName: 'Sample Delegate',
      eventName: 'AI/ML Coding Marathon 2026',
      category: 'Technical Hackathon',
      venue: 'Auditorium 2',
      hallNumber: 'Auditorium 2',
      checkInTime: '09:35 AM',
      roll_no: '22CS999',
      collegeName: 'National Engineering College',
      department: 'Computer Science',
    },
  };
  const res3 = createMockRes();
  await attendanceHandler(req3, res3);
  console.log(`  Status: ${res3.statusCode} | Result:`, res3.jsonData);

  console.log('\n====================================================');
  console.log('🏁 DISPATCH SUMMARY');
  console.log('====================================================');
  console.log(`Welcome Email:      ${res1.jsonData?.success ? '✅ SUCCESS' : '❌ FAILED'} (MessageID: ${res1.jsonData?.messageId || 'none'})`);
  console.log(`Registration Email: ${res2.jsonData?.success ? '✅ SUCCESS' : '❌ FAILED'} (MessageID: ${res2.jsonData?.messageId || 'none'})`);
  console.log(`Attendance Email:   ${res3.jsonData?.success ? '✅ SUCCESS' : '❌ FAILED'} (MessageID: ${res3.jsonData?.messageId || 'none'})`);
  console.log('====================================================\n');
}

main().catch(console.error);
