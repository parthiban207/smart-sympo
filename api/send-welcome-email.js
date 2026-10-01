// agent-notes: { ctx: "Vercel Serverless Function for Welcome & First Login emails to Students, Coordinators, and Admins", deps: ["nodemailer", "./_mailer.js"], state: "active", last: "antigravity@2026-10-01" }

import { createTransporter, getSmtpCredentials, setCorsHeaders } from './_mailer.js';

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { email, name, role, roll_no, collegeName, department, loginUrl } = body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Recipient email address is required.' });
    }

    const { gmailUser } = getSmtpCredentials();
    const senderEmail = gmailUser || 'smartsympo@gmail.com';
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
    let targetUrl = loginUrl || 'https://smart-sympo.vercel.app/login/student';
    let btnText = '🚀 Log In to Student Portal';
    let btnGradient = 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)';
    let userName = name || (email.includes('@') ? email.split('@')[0] : 'Student Delegate');
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
      targetUrl = loginUrl || 'https://smart-sympo.vercel.app/login/admin';
      btnText = '🚀 Open Admin Console';
      btnGradient = 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)';
      userName = name || (email.includes('@') ? email.split('@')[0] : 'Administrator');
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
      targetUrl = loginUrl || 'https://smart-sympo.vercel.app/login/staff';
      btnText = '🚀 Open Coordinator Portal';
      btnGradient = 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)';
      userName = name || (email.includes('@') ? email.split('@')[0] : 'Event Coordinator');
      introDesc = 'Welcome to SmartSympo! Your Coordinator account is ready. You have authorized access to manage venue schedules, broadcast live delay alerts, and scan student TOTP QR passes.';
      highlights = `
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">📡 <strong>Track Management:</strong> Adjust stages, schedule timings, and delay broadcasts.</div>
        <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">📷 <strong>TOTP Scanner:</strong> Instant entry check-in with fraud protection.</div>
        <div style="font-size: 13px; color: #cbd5e1;">📢 <strong>Broadcasts:</strong> Send urgent alerts to registered delegates.</div>
      `;
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; padding: 40px 10px; color: #f8fafc;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          <div style="background: ${badgeColor}; padding: 36px 32px; text-align: center;">
            <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; margin-bottom: 8px;">
              ${badge}
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 26px;">${heroTitle}</h1>
            <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">${heroSubtitle}</p>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #f1f5f9; margin-top: 0;">Hi <strong>${userName}</strong>,</p>
            <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">${introDesc}</p>
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
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">SmartSympo Organizing Team • ${senderEmail}</p>
          </div>
        </div>
      </div>
    `;

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"SmartSympo 2026" <${senderEmail}>`,
      to: email,
      replyTo: senderEmail,
      subject,
      text: `Welcome ${userName}! Your SmartSympo ${roleName} account has been activated.\nEmail: ${email}\nID: ${idVal}\nLogin URL: ${targetUrl}`,
      html,
    });

    console.log(`[Vercel Serverless] Welcome email sent to ${email} (MessageID: ${info.messageId})`);
    return res.status(200).json({ success: true, dispatched: true, messageId: info.messageId, to: email });
  } catch (err) {
    console.error('[Vercel Serverless Welcome Email Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
