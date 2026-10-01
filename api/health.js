// agent-notes: { ctx: "Vercel Serverless health check endpoint", deps: ["./_mailer.js"], state: "active", last: "antigravity@2026-10-01" }

import { getSmtpCredentials, setCorsHeaders } from './_mailer.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  const { gmailUser, gmailPass } = getSmtpCredentials();

  return res.status(200).json({
    status: 'ok',
    service: 'SmartSympo Vercel Email Dispatch Gateway',
    smtpConfigured: Boolean(gmailUser && gmailPass),
    sender: gmailUser,
    timestamp: new Date().toISOString(),
  });
}
