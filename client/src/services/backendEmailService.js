// agent-notes: { ctx: "Client API helper for Nodemailer automated Welcome, Signup Confirmation, and Event Registration emails with resilient fallback", deps: [], state: "active", last: "antigravity@2026-09-07" }

const getCandidateUrls = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  const isBrowser = typeof window !== 'undefined';
  const isLocal = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const candidates = [];
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    candidates.push(envUrl.trim().replace(/\/+$/, ''));
  }
  // Relative URL (proxied by Vite in dev or same-origin in prod)
  candidates.push('');
  // Direct localhost port 5000
  if (isLocal) {
    candidates.push('http://localhost:5000');
    candidates.push('http://127.0.0.1:5000');
  }

  return [...new Set(candidates)];
};

async function fetchWithFallback(endpoint, payload) {
  const candidates = getCandidateUrls();
  let lastError = null;

  for (const baseUrl of candidates) {
    const url = `${baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return { success: true, dispatched: true, url, ...data };
      } else {
        console.warn(`[BackendEmailService] Call to ${url} failed with status:`, response.status, data);
        lastError = data.error || `HTTP ${response.status}`;
      }
    } catch (err) {
      lastError = err?.message || 'Network error';
    }
  }

  console.warn(`[BackendEmailService] All API candidate routes failed for ${endpoint}:`, lastError);
  return { success: false, error: lastError };
}

/**
 * Dispatch Welcome & Signup Confirmation email via Express/Nodemailer backend API
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

  const payload = {
    email: email.trim(),
    name: name || email.split('@')[0] || 'Student Delegate',
    role: role || 'student',
    roll_no: roll_no || '',
    collegeName: collegeName || '',
    department: department || '',
    loginUrl: loginUrl || (typeof window !== 'undefined' ? `${window.location.origin}/login/student` : ''),
  };

  const result = await fetchWithFallback('/api/send-welcome-email', payload);
  if (result.success) {
    console.log('[BackendEmailService] Welcome email dispatched successfully to:', email);
  }
  return result;
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
  passToken,
  roll_no,
  collegeName,
}) {
  if (!email) {
    console.warn('[BackendEmailService] sendEventConfirmationApi called without recipient email.');
    return { success: false, error: 'Recipient email required' };
  }

  const payload = {
    email: email.trim(),
    name: name || email.split('@')[0] || 'Participant',
    eventName: eventName || 'Symposium Event',
    category: category || 'General Session',
    venue: venue || 'Main Auditorium',
    timeSlot: timeSlot || 'Scheduled Time Slot',
    eventDate: eventDate || new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
    passToken: passToken || '',
    roll_no: roll_no || '',
    collegeName: collegeName || '',
  };

  const result = await fetchWithFallback('/api/send-event-confirmation', payload);
  if (result.success) {
    console.log('[BackendEmailService] Event confirmation email dispatched successfully to:', email);
  }
  return result;
}

/**
 * Dispatch login security alert email via Express/Nodemailer backend API
 */
export async function sendLoginAlertApi({ email, name, role, ipAddress, userAgent }) {
  if (!email) return { success: false };

  const payload = {
    email: email.trim(),
    name: name || email.split('@')[0] || 'User',
    role: role || 'user',
    ipAddress: ipAddress || 'Browser Web Client',
    userAgent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Web'),
  };

  return await fetchWithFallback('/api/send-login-alert', payload);
}

