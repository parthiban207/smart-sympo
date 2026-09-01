// agent-notes: { ctx: "Client API helper for Nodemailer automated Welcome, Signup Confirmation, and Event Registration emails", deps: [], state: "active", last: "antigravity@2026-09-01" }

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

/**
 * Dispatch Welcome & Signup Confirmation email via Express/Nodemailer backend API
 * @param {Object} params
 * @param {string} params.email
 * @param {string} [params.name]
 * @param {string} [params.role]
 * @param {string} [params.roll_no]
 * @param {string} [params.collegeName]
 * @param {string} [params.department]
 * @param {string} [params.loginUrl]
 */
export async function sendWelcomeEmailApi({
  email,
  name,
  role = 'student',
  roll_no = '',
  collegeName = '',
  department = '',
  loginUrl = '',
}) {
  if (!email) {
    console.warn('[BackendEmailService] sendWelcomeEmailApi called without recipient email.');
    return { success: false, error: 'Recipient email required' };
  }

  const resolvedUrl =
    API_BASE_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

  const payload = {
    email: email.trim(),
    name: name || email.split('@')[0] || 'Student Delegate',
    role: role || 'student',
    roll_no: roll_no || '',
    collegeName: collegeName || '',
    department: department || '',
    loginUrl: loginUrl || (typeof window !== 'undefined' ? `${window.location.origin}/login/student` : ''),
  };

  try {
    const response = await fetch(`${resolvedUrl}/api/send-welcome-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('[BackendEmailService] Welcome email API returned status:', response.status, data);
      return { success: false, status: response.status, ...data };
    }

    console.log('[BackendEmailService] Welcome email dispatched successfully:', data);
    return { success: true, ...data };
  } catch (err) {
    console.warn('[BackendEmailService] Non-blocking error calling welcome-email API:', err?.message || err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Dispatch event registration confirmation email via Express/Nodemailer backend API
 */
export async function sendEventConfirmationApi({
  email,
  name,
  eventName,
  category,
  venue,
  timeSlot,
  eventDate,
}) {
  if (!email) {
    console.warn('[BackendEmailService] sendEventConfirmationApi called without recipient email.');
    return { success: false, error: 'Recipient email required' };
  }

  const resolvedUrl =
    API_BASE_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

  const payload = {
    email: email.trim(),
    name: name || email.split('@')[0] || 'Participant',
    eventName: eventName || 'Symposium Event',
    category: category || 'General Session',
    venue: venue || 'Main Auditorium',
    timeSlot: timeSlot || 'Scheduled Time Slot',
    eventDate: eventDate || new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
  };

  try {
    const response = await fetch(`${resolvedUrl}/api/send-event-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('[BackendEmailService] Event confirmation API returned status:', response.status, data);
      return { success: false, status: response.status, ...data };
    }

    console.log('[BackendEmailService] Event confirmation email dispatched successfully:', data);
    return { success: true, ...data };
  } catch (err) {
    console.warn('[BackendEmailService] Non-blocking error calling event-confirmation API:', err?.message || err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Dispatch login security alert email via Express/Nodemailer backend API
 */
export async function sendLoginAlertApi({ email, name, role, ipAddress, userAgent }) {
  if (!email) return { success: false };

  const resolvedUrl =
    API_BASE_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

  const payload = {
    email: email.trim(),
    name: name || email.split('@')[0] || 'User',
    role: role || 'user',
    ipAddress: ipAddress || 'Browser Web Client',
    userAgent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Web'),
  };

  try {
    const response = await fetch(`${resolvedUrl}/api/send-login-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return { success: response.ok, ...data };
  } catch (err) {
    return { success: false, error: err?.message || 'Network error' };
  }
}
