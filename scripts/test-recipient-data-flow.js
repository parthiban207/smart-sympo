// agent-notes: { ctx: "Automated test script verifying recipient email data flow, validation, and safe diagnostics across all 3 endpoints", deps: ["nodemailer", "dotenv"], state: "active", last: "antigravity@2026-10-01" }

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import welcomeHandler from '../api/send-welcome-email.js';
import eventHandler from '../api/send-event-confirmation.js';
import attendanceHandler from '../api/send-attendance-email.js';

// Mock response builder
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

async function runRecipientFlowTests() {
  console.log('====================================================');
  console.log('🧪 TESTING RECIPIENT DATA FLOW & VALIDATION');
  console.log('====================================================\n');

  const testUserEmail = process.env.TEST_USER_EMAIL || process.env.GMAIL_USER || 'smartsympo@gmail.com';

  // 1. Test Welcome Email with Real User Payload
  console.log('[1/4] Testing POST /api/send-welcome-email with user.email payload...');
  const req1 = {
    method: 'POST',
    body: {
      email: testUserEmail,
      name: 'Priya Sharma',
      role: 'student',
      roll_no: '22CS089',
      collegeName: 'Anna University Campus',
      department: 'Computer Science',
    },
  };
  const res1 = createMockRes();
  await welcomeHandler(req1, res1);
  console.log('  Response Status:', res1.statusCode);
  console.log('  Response Payload:', JSON.stringify(res1.jsonData, null, 2));
  if (res1.statusCode !== 200 || !res1.jsonData?.success) {
    throw new Error(`Welcome email failed: ${JSON.stringify(res1.jsonData)}`);
  }

  // 2. Test Event Registration Confirmation with Real User Payload
  console.log('\n[2/4] Testing POST /api/send-event-confirmation with user.email payload...');
  const req2 = {
    method: 'POST',
    body: {
      email: testUserEmail,
      name: 'Priya Sharma',
      eventName: 'AI / ML Hackathon 2026',
      category: 'Technical Hackathon',
      venue: 'Lab 4, Tech Block',
      timeSlot: '10:00 AM - 01:00 PM',
      eventDate: 'October 15, 2026',
      passToken: 'PASS-PRY89-AI2026',
      roll_no: '22CS089',
      collegeName: 'Anna University Campus',
    },
  };
  const res2 = createMockRes();
  await eventHandler(req2, res2);
  console.log('  Response Status:', res2.statusCode);
  console.log('  Response Payload:', JSON.stringify(res2.jsonData, null, 2));
  if (res2.statusCode !== 200 || !res2.jsonData?.success) {
    throw new Error(`Event confirmation email failed: ${JSON.stringify(res2.jsonData)}`);
  }

  // 3. Test Attendance Confirmation with Real User Payload
  console.log('\n[3/4] Testing POST /api/send-attendance-email with user.email payload...');
  const req3 = {
    method: 'POST',
    body: {
      email: testUserEmail,
      studentName: 'Priya Sharma',
      eventName: 'AI / ML Hackathon 2026',
      category: 'Technical Hackathon',
      venue: 'Lab 4, Tech Block',
      hallNumber: 'Lab 4',
      checkInTime: '10:05 AM',
      roll_no: '22CS089',
      collegeName: 'Anna University Campus',
      department: 'Computer Science',
    },
  };
  const res3 = createMockRes();
  await attendanceHandler(req3, res3);
  console.log('  Response Status:', res3.statusCode);
  console.log('  Response Payload:', JSON.stringify(res3.jsonData, null, 2));
  if (res3.statusCode !== 200 || !res3.jsonData?.success) {
    throw new Error(`Attendance email failed: ${JSON.stringify(res3.jsonData)}`);
  }

  // 4. Test Invalid / Missing Recipient Email Rejection
  console.log('\n[4/4] Testing Invalid/Missing Recipient Rejection (empty, "N/A", null)...');
  const invalidTests = [
    { email: '', desc: 'Empty string' },
    { email: 'N/A', desc: 'N/A string' },
    { email: 'undefined', desc: 'undefined string' },
    { email: null, desc: 'null value' },
  ];

  for (const t of invalidTests) {
    const invReq = { method: 'POST', body: { email: t.email, name: 'Invalid User' } };
    const invRes = createMockRes();
    await welcomeHandler(invReq, invRes);
    if (invRes.statusCode === 400 && invRes.jsonData?.success === false) {
      console.log(`  ✅ Correctly rejected invalid recipient (${t.desc}): HTTP 400 Bad Request`);
    } else {
      throw new Error(`Failed to reject invalid recipient (${t.desc}): status ${invRes.statusCode}`);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 ALL RECIPIENT DATA FLOW TESTS PASSED!');
  console.log('====================================================');
}

runRecipientFlowTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
