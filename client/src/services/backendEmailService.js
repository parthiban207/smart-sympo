// agent-notes: { ctx: "Client API helper for Nodemailer automated Welcome, Signup Confirmation, Event Registration, and Student App Feedback emails", deps: [], state: "active", last: "antigravity@2026-09-30" }

const getCandidateUrls = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  const isBrowser = typeof window !== 'undefined';
  const isLocal = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const candidates = [];

  // Always prioritize relative path '' first so on Vercel/production it directly hits /api/*
  candidates.push('');

  if (isLocal) {
    if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
      candidates.push(envUrl.trim().replace(/\/+$/, ''));
    }
    candidates.push('http://localhost:5000');
    candidates.push('http://127.0.0.1:5000');
  } else {
    // In production, only accept valid non-localhost envUrl if configured
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      candidates.push(envUrl.trim().replace(/\/+$/, ''));
    }
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

      const contentType = response.headers.get('content-type') || '';
      // If the response is HTML (e.g., single-page app rewrite to index.html), it is not a valid API response
      if (!contentType.includes('application/json')) {
        lastError = `Endpoint ${url} returned non-JSON (${contentType || 'HTML fallback'})`;
        continue;
      }

      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.success !== false) {
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

  const cleanRole = (role || 'student').toLowerCase();
  const defaultLoginPath = cleanRole === 'admin' ? '/login/admin' : (cleanRole === 'coordinator' || cleanRole === 'staff' ? '/login/staff' : '/login/student');
  const defaultLoginUrl = typeof window !== 'undefined' ? `${window.location.origin}${defaultLoginPath}` : `http://localhost:5173${defaultLoginPath}`;
  const defaultRoleName = cleanRole === 'admin' ? 'Administrator' : (cleanRole === 'coordinator' ? 'Event Coordinator' : 'Student Delegate');

  const payload = {
    email: email.trim(),
    name: name || (email.includes('@') ? email.split('@')[0] : defaultRoleName),
    role: cleanRole,
    roll_no: roll_no || '',
    collegeName: collegeName || '',
    department: department || '',
    loginUrl: loginUrl || defaultLoginUrl,
  };

  const result = await fetchWithFallback('/api/send-welcome-email', payload);
  if (result.success) {
    console.log(`[BackendEmailService] Welcome email dispatched successfully (${cleanRole}) to:`, email);
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

/**
 * Dispatch student application feedback notification to Admin via backend Express API
 */
export async function sendAppFeedbackToAdminApi(feedbackData) {
  if (!feedbackData || !feedbackData.message) return { success: false, error: 'Feedback message required' };

  return await fetchWithFallback('/api/send-admin-feedback', feedbackData);
}

/**
 * Dispatch admin response email to student regarding their feedback
 */
export async function sendFeedbackReplyApi({
  student_email,
  student_name,
  feedback_id,
  original_title,
  category,
  original_message,
  reply_message,
  admin_name,
  status = 'resolved',
}) {
  if (!student_email) {
    return { success: false, error: 'Student email is required.' };
  }
  if (!reply_message || !reply_message.trim()) {
    return { success: false, error: 'Reply message cannot be empty.' };
  }

  const payload = {
    student_email: student_email.trim(),
    student_name: student_name || 'Student',
    feedback_id: feedback_id || '',
    original_title: original_title || '',
    category: category || 'general',
    original_message: original_message || '',
    reply_message: reply_message.trim(),
    admin_name: admin_name || 'SmartSympo Administration',
    status: status || 'resolved',
  };

  return await fetchWithFallback('/api/send-feedback-reply', payload);
}

/**
 * Dispatch QR scan attendance confirmation email via Express/Nodemailer backend API
 */
export async function sendAttendanceConfirmationApi({
  email,
  name,
  studentName,
  eventName,
  eventTitle,
  category,
  venue,
  hallNumber,
  checkInTime,
  attendedAt,
  roll_no,
  rollNo,
  collegeName,
  department,
}) {
  if (!email) {
    console.warn('[BackendEmailService] sendAttendanceConfirmationApi called without recipient email.');
    return { success: false, error: 'Recipient email required' };
  }

  const payload = {
    email: email.trim(),
    name: studentName || name || email.split('@')[0] || 'Student',
    studentName: studentName || name || email.split('@')[0] || 'Student',
    eventName: eventTitle || eventName || 'Symposium Session',
    eventTitle: eventTitle || eventName || 'Symposium Session',
    category: category || 'Technical Session',
    venue: hallNumber || venue || 'Main Auditorium',
    hallNumber: hallNumber || venue || 'Main Auditorium',
    checkInTime: checkInTime || attendedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    attendedAt: attendedAt || checkInTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    roll_no: roll_no || rollNo || '',
    rollNo: roll_no || rollNo || '',
    collegeName: collegeName || '',
    department: department || '',
  };

  const result = await fetchWithFallback('/api/send-attendance-email', payload);
  if (result.success) {
    console.log('[BackendEmailService] Attendance confirmation email dispatched successfully to:', email);
  }
  return result;
}

/**
 * Dispatch test email to any arbitrary student mailbox for verification
 */
export async function sendTestEmailApi({ email, type = 'welcome', name = 'Test Student' }) {
  if (!email || !email.trim()) {
    return { success: false, error: 'Recipient email required for test' };
  }

  const payload = {
    email: email.trim(),
    type,
    name,
  };

  return await fetchWithFallback('/api/send-test-email', payload);
}


