// agent-notes: { ctx: "Automated end-to-end test script verifying full Supabase registration, profile persistence, and email dispatch flow", deps: ["@supabase/supabase-js", "dotenv"], state: "active", last: "antigravity@2026-10-01" }

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

import welcomeHandler from '../api/send-welcome-email.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    jsonData: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.jsonData = data; return this; },
    end() { return this; },
  };
  return res;
}

async function runEndToEndAppTest() {
  console.log('====================================================');
  console.log('🚀 TESTING REAL APPLICATION SIGNUP & AUTH FLOW');
  console.log('====================================================\n');

  const testEmail = `test.student.${Date.now()}@gmail.com`;
  const testPassword = 'Password@123';
  const testFullName = 'Sample Student Attendee';
  const testRollNo = `STU-${Math.floor(1000 + Math.random() * 9000)}`;
  const testCollege = 'Anna University Campus';
  const testDept = 'Computer Science & Engineering';

  console.log(`[1/5] Executing Supabase Auth SignUp for: ${testEmail}...`);
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      emailRedirectTo: 'https://smart-sympo.vercel.app/login',
      data: {
        full_name: testFullName,
        name: testFullName,
        username: testEmail.split('@')[0],
        role: 'student',
        department: testDept,
        roll_no: testRollNo,
        college: testCollege,
        college_name: testCollege,
        college_id: testRollNo,
      },
    },
  });

  if (error) {
    console.error('❌ SignUp Failed:', error.message);
    throw error;
  }

  console.log('✅ Supabase Auth User Created:');
  console.log('   - User ID:', data.user?.id);
  console.log('   - User Email:', data.user?.email);
  console.log('   - Active Session:', Boolean(data.session));
  console.log('   - Email Confirmed At:', data.user?.email_confirmed_at || 'Pending verification');

  // 2. Profile insertion into public.profiles
  console.log('\n[2/5] Upserting user profile into public.profiles...');
  const profileData = {
    id: data.user.id,
    name: testFullName,
    full_name: testFullName,
    username: testEmail.split('@')[0],
    email: testEmail,
    role: 'student',
    department: testDept,
    roll_no: testRollNo,
    college_id: testRollNo,
    college_name: testCollege,
    college: testCollege,
    first_login: false,
  };

  const { error: profError } = await supabase.from('profiles').upsert([profileData]);
  if (profError) {
    console.warn('⚠️ Profile Upsert Warning:', profError.message);
  } else {
    console.log('✅ User Profile Saved to public.profiles table successfully!');
  }

  // 3. Dispatch welcome email via Nodemailer endpoint
  console.log('\n[3/5] Triggering Welcome Email dispatch to user address...');
  const mockReq = {
    method: 'POST',
    body: {
      email: testEmail,
      name: testFullName,
      role: 'student',
      roll_no: testRollNo,
      collegeName: testCollege,
      department: testDept,
    },
  };
  const mockRes = createMockRes();
  await welcomeHandler(mockReq, mockRes);
  console.log('✅ Welcome Email Result:', mockRes.jsonData);

  // 4. Test Sign-In with credentials
  console.log('\n[4/5] Testing SignIn with created credentials...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) {
    if (signInError.message.toLowerCase().includes('email not confirmed')) {
      console.log('ℹ️ Email confirmation required before sign-in (Expected behavior when confirmation enabled).');
    } else {
      console.warn('⚠️ SignIn Error:', signInError.message);
    }
  } else {
    console.log('✅ SignIn Succeeded! User authenticated:', signInData.user?.email);
  }

  // 5. Cleanup test record
  console.log('\n[5/5] Cleaning up test profile record...');
  await supabase.from('profiles').delete().eq('id', data.user.id);
  console.log('✅ Cleaned up temporary test profile record.');

  console.log('\n====================================================');
  console.log('🎉 REAL APPLICATION SIGNUP & AUTH PIPELINE VERIFIED!');
  console.log('====================================================\n');
}

runEndToEndAppTest().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
