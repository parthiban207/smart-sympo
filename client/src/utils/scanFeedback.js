// agent-notes: { ctx: "Audio synthesizer & haptic feedback for QR scanning and verification", deps: [], state: "active", last: "antigravity@2026-08-26" }

/**
 * Web Audio API based sound synthesizer for reliable scanning sound cues across all browsers
 */
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    return new AudioContextClass();
  } catch (e) {
    console.warn('AudioContext creation error:', e);
    return null;
  }
}

/**
 * Play a pleasant 2-tone success chime (e.g., C5 -> E5 -> G5)
 */
export function playScanSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // First note: 523.25 Hz (C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // Ramp to E5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second note: 783.99 Hz (G5) chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.12);
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.4);
  } catch (err) {
    console.warn('[Scan Success Sound Warning]:', err);
  }
}

/**
 * Play warning alert sound (Already scanned)
 */
export function playScanWarningSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(370, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (err) {
    console.warn('[Scan Warning Sound Warning]:', err);
  }
}

/**
 * Play error alert sound (Invalid QR)
 */
export function playScanErrorSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (err) {
    console.warn('[Scan Error Sound Warning]:', err);
  }
}

/**
 * Trigger mobile vibration/haptic feedback
 */
export function triggerScanHaptic(type = 'success') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'success') {
        navigator.vibrate([70, 40, 90]);
      } else if (type === 'warning') {
        navigator.vibrate([120, 60, 120]);
      } else if (type === 'error') {
        navigator.vibrate([200]);
      }
    } catch {
      // ignore
    }
  }
}
