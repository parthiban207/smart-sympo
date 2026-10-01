// agent-notes: { ctx: "Self-contained Vercel Serverless nodemailer helper with CORS and Gmail SMTP dispatch", deps: ["nodemailer"], state: "active", last: "antigravity@2026-10-01" }

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
