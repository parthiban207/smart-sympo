// agent-notes: { ctx: "Vercel Serverless health check and safe SMTP diagnostic endpoint", deps: ["./_mailer.js"], state: "active", last: "antigravity@2026-10-01" }

import { getSmtpCredentials, createTransporter, setCorsHeaders } from './_mailer.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { gmailUser, gmailPass } = getSmtpCredentials();
  const hasUser = Boolean(gmailUser && gmailUser.trim().length > 0);
  const hasPass = Boolean(gmailPass && gmailPass.trim().length > 0);

  let smtpConnected = false;
  let smtpError = null;

  if (hasUser && hasPass) {
    try {
      const transporter = createTransporter();
      await transporter.verify();
      smtpConnected = true;
    } catch (err) {
      smtpConnected = false;
      smtpError = err.message || 'SMTP Authentication Failed';
    }
  }

  return res.status(200).json({
    status: smtpConnected ? 'healthy' : 'degraded',
    service: 'SmartSympo Email Gateway',
    diagnostics: {
      gmailUserConfigured: hasUser,
      gmailAppPasswordConfigured: hasPass,
      sender: hasUser ? `${gmailUser.substring(0, 3)}***@${gmailUser.split('@')[1] || 'gmail.com'}` : null,
      fullSenderAddress: gmailUser || null,
      smtpConnected,
      smtpError: smtpError ? (smtpError.includes('BadCredentials') ? 'Authentication Failed: Invalid App Password' : smtpError) : null,
    },
    timestamp: new Date().toISOString(),
  });
}

