// agent-notes: { ctx: "Dynamic event timing, status calculation (EXPIRED, LIVE_NOW, UPCOMING), countdown formatting, and auto-ticking timer hook", deps: ["react"], state: "active", last: "antigravity@2026-09-07" }

import { useState, useEffect } from 'react';

/**
 * Calculates dynamic event timing status and remaining time.
 * @param {Object} event - Event object with start_time and end_time (or ISO date strings)
 * @param {Date|number} [now=Date.now()] - Reference current timestamp
 * @returns {Object} { status, isExpired, isLive, isUpcoming, daysLeft, hoursLeft, minutesLeft, countdownText, formattedBadgeText, venue }
 */
export function getEventTimingStatus(event, now = Date.now()) {
  if (!event) {
    return {
      status: 'UPCOMING',
      isExpired: false,
      isLive: false,
      isUpcoming: true,
      daysLeft: 0,
      hoursLeft: 0,
      minutesLeft: 0,
      countdownText: '',
      formattedBadgeText: '',
      venue: 'Main Venue',
    };
  }

  const currentMs = typeof now === 'number' ? now : new Date(now).getTime();

  const startMs = event.start_time ? new Date(event.start_time).getTime() : NaN;
  let endMs = event.end_time ? new Date(event.end_time).getTime() : NaN;
  if (isNaN(endMs) && !isNaN(startMs)) {
    // Default duration: 2 hours if end_time is not explicitly specified
    endMs = startMs + 2 * 60 * 60 * 1000;
  }

  const venue = event.venue || event.hall_number || 'Main Venue';

  // If no valid start time, fallback gracefully using existing status string
  if (isNaN(startMs)) {
    const isExp = event.status === 'Completed';
    const isLv = event.status === 'In Progress';
    return {
      status: isExp ? 'EXPIRED' : isLv ? 'LIVE_NOW' : 'UPCOMING',
      isExpired: isExp,
      isLive: isLv,
      isUpcoming: !isExp && !isLv,
      daysLeft: 0,
      hoursLeft: 0,
      minutesLeft: 0,
      countdownText: isExp ? 'Timing Over' : isLv ? 'Live Now' : 'Scheduled',
      formattedBadgeText: isExp
        ? 'Event Ended / Timing Over ❌'
        : isLv
        ? `● Live Now (Hall: ${venue})`
        : 'Scheduled',
      venue,
    };
  }

  // 1. If currentTime > event.end_time: EXPIRED
  if (currentMs > endMs) {
    return {
      status: 'EXPIRED',
      isExpired: true,
      isLive: false,
      isUpcoming: false,
      daysLeft: 0,
      hoursLeft: 0,
      minutesLeft: 0,
      countdownText: 'Timing Over',
      formattedBadgeText: 'Event Ended / Timing Over ❌',
      venue,
    };
  }

  // 2. If currentTime >= event.start_time && currentTime <= event.end_time: LIVE_NOW
  if (currentMs >= startMs && currentMs <= endMs) {
    return {
      status: 'LIVE_NOW',
      isExpired: false,
      isLive: true,
      isUpcoming: false,
      daysLeft: 0,
      hoursLeft: 0,
      minutesLeft: 0,
      countdownText: 'Live Now',
      formattedBadgeText: `● Live Now (Hall: ${venue})`,
      venue,
    };
  }

  // 3. If currentTime < event.start_time: UPCOMING with countdown
  const diffMs = Math.max(0, startMs - currentMs);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  let countdownText = '';
  if (days > 0) {
    countdownText = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    countdownText = `${hours}h ${minutes}m`;
  } else {
    countdownText = `${minutes}m`;
  }

  return {
    status: 'UPCOMING',
    isExpired: false,
    isLive: false,
    isUpcoming: true,
    daysLeft: days,
    hoursLeft: hours,
    minutesLeft: minutes,
    countdownText,
    formattedBadgeText: `Starts in: ${countdownText} ⏳`,
    venue,
  };
}

/**
 * Custom React hook that ticks every `intervalMs` (default 60s / 60000ms)
 * to keep dynamic event statuses and countdowns automatically updated without manual reloads.
 * @param {number} [intervalMs=60000]
 * @returns {number} Current timestamp in milliseconds
 */
export function useCurrentTime(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
