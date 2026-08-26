// agent-notes: { ctx: "Client API helper for Nodemailer automated Welcome & First Login and Event Confirmation emails", deps: [], state: "active", last: "antigravity@2026-08-26" }

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Dispatch Welcome & First Login email via Express/Nodemailer backend API
 * @param {Object} params
 * @param {string} params.email
 * @param {string} [params.name]
 * @param {string} [params.role]
 */
export async function sendWelcomeEmailApi({ email, name, role }) {
  if (!email) {
    console.warn('[BackendEmailService] sendWelcomeEmailApi called without recipient email.');
    return { success: false, error: 'Recipient email required' };
  }

  const payload = {
    email: email.trim(),
    name: name || email.split('@')[0] || 'Student',
    role: role || 'Student',
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/send-welcome-email`, {
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
 * @param {Object} params
 * @param {string} params.email
 * @param {string} [params.name]
 * @param {string} params.eventName
 * @param {string} [params.category]
 * @param {string} [params.venue]
 * @param {string} [params.timeSlot]
 * @param {string} [params.eventDate]
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
    const response = await fetch(`${API_BASE_URL}/api/send-event-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.warn('[BackendEmailService] Event confirmation API returned status:', response.status, data);
      return { success: false, status: response.status, ...data };
    }

    console.log('[BackendEmailService] Event confirmation dispatched successfully:', data);
    return { success: true, ...data };
  } catch (err) {
    console.warn('[BackendEmailService] Non-blocking error calling event-confirmation API:', err?.message || err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Dispatch login alert email via Express/Nodemailer backend API
 * @param {Object} params
 * @param {string} params.email
 * @param {string} [params.name]
 * @param {string} [params.role]
 * @param {string} [params.timestamp]
 */
export async function sendLoginAlertApi({ email, name, role, timestamp }) {
  if (!email) {
    console.warn('[BackendEmailService] sendLoginAlertApi called without recipient email.');
    return { success: false, error: 'Recipient email required' };
  }

  const payload = {
    email: email.trim(),
    name: name || email.split('@')[0],
    role: role || 'Student',
    timestamp: timestamp || new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' }),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/send-login-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, status: response.status, ...data };
    }
    return { success: true, ...data };
  } catch (err) {
    return { success: false, error: err?.message || 'Network error' };
  }
}
