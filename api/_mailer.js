// agent-notes: { ctx: "Self-contained Vercel Serverless nodemailer helper with CORS, safe diagnostics, and Gmail SMTP dispatch", deps: ["nodemailer"], state: "active", last: "antigravity@2026-10-01" }

import nodemailer from 'nodemailer';

const DEFAULT_GMAIL_USER = 'smartsympo@gmail.com';
const DEFAULT_GMAIL_APP_PASS = 'zjrltozymelgblor';

export const getSmtpCredentials = () => {
  const gmailUser = (process.env.GMAIL_USER || DEFAULT_GMAIL_USER).trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || DEFAULT_GMAIL_APP_PASS).replace(/\s+/g, '');
  return { gmailUser, gmailPass };
};

export const createTransporter = () => {
  const { gmailUser, gmailPass } = getSmtpCredentials();
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });
};

export const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
};

export const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return 'none';
  const trimmed = email.trim();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return 'invalid-email-format';
  const user = parts[0];
  const domain = parts[1];
  const visible = user.length > 2 ? user.slice(0, 2) : user.slice(0, 1);
  return `${visible}***@${domain}`;
};

export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  if (clean === 'n/a' || clean === 'undefined' || clean === 'null' || clean === '') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
};

export const logSafeEmailEvent = ({ action, recipient, success, messageId, error }) => {
  const maskedRecipient = maskEmail(recipient);
  const recipientExists = Boolean(recipient && recipient.trim().length > 0);
  const info = {
    action,
    recipientExists,
    maskedRecipient,
    success: Boolean(success),
    ...(messageId ? { messageId } : {}),
    ...(error ? { serverError: typeof error === 'string' ? error : error?.message || 'Unknown error' } : {}),
    timestamp: new Date().toISOString(),
  };
  if (success) {
    console.log(`[SafeEmailDiagnostics] ${action} SUCCESS -> to: ${maskedRecipient}, messageId: ${messageId || 'N/A'}`);
  } else {
    console.warn(`[SafeEmailDiagnostics] ${action} FAILURE -> to: ${maskedRecipient}, error: ${info.serverError}`);
  }
  return info;
};

export const verifyTransporterConnection = async (transporter) => {
  try {
    await transporter.verify();
    console.log('[Nodemailer SMTP] Gmail connection authenticated successfully.');
    return true;
  } catch (err) {
    console.error('[Nodemailer SMTP Authentication Error]:', err.message);
    return false;
  }
};

