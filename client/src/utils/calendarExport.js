// agent-notes: { ctx: "Utility to export symposium event sessions as .ics iCalendar files for Google Calendar, Apple Calendar, and Outlook", deps: [], state: "active", last: "antigravity@2026-09-01" }

/**
 * Format a Date or ISO string into an iCalendar formatted timestamp (YYYYMMDDTHHmmssZ)
 */
function formatICSDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    const now = new Date();
    return now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Escape special characters in text fields according to RFC 5545
 */
function escapeICSText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate iCalendar .ics file content for a single session
 */
export function generateEventICS(event) {
  const uid = `smart-sympo-${event.id || Date.now()}@college.edu`;
  const stamp = formatICSDate(new Date());
  const start = formatICSDate(event.start_time || new Date());
  const end = formatICSDate(event.end_time || new Date(Date.now() + 3600000));
  const summary = escapeICSText(event.title || 'Symposium Session');
  const description = escapeICSText(
    `${event.description || ''}\n\nCategory: ${event.category || 'Technical Track'}\nVenue: ${event.hall_number || 'Main Hall'}`
  );
  const location = escapeICSText(event.hall_number || 'Campus Auditorium');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmartSympo//Academic Symposium System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Symposium Session Starting Soon',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Generate iCalendar .ics file content for multiple sessions
 */
export function generateMultiEventICS(events, calendarTitle = 'SmartSympo Schedule') {
  const stamp = formatICSDate(new Date());

  const vevents = events.map((event, idx) => {
    const uid = `smart-sympo-${event.id || idx}-${Date.now()}@college.edu`;
    const start = formatICSDate(event.start_time || new Date());
    const end = formatICSDate(event.end_time || new Date(Date.now() + 3600000));
    const summary = escapeICSText(event.title || 'Symposium Session');
    const description = escapeICSText(
      `${event.description || ''}\n\nCategory: ${event.category || 'Technical Track'}\nVenue: ${event.hall_number || 'Main Hall'}`
    );
    const location = escapeICSText(event.hall_number || 'Campus Auditorium');

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder: Upcoming Session in 15 mins',
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmartSympo//Academic Symposium System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSText(calendarTitle)}`,
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Trigger file download of .ics content
 */
export function downloadICSFile(filename, icsContent) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
