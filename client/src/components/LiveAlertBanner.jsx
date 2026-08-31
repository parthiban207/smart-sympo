// agent-notes: { ctx: "Ultra-clean live alert and emergency announcement banner with audio alarm controls and dismiss triggers", deps: ["src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  AlertOctagon,
  Clock,
  ShieldAlert,
  Radio,
  X,
  StopCircle,
  VolumeX,
  Volume2,
} from 'lucide-react';

export default function LiveAlertBanner() {
  const { liveAlerts, dismissedAlertIds, dismissLocalAlert, clearGlobalEmergencyBroadcast, currentUser } = useApp();
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  // Filter out alerts that this specific user has dismissed locally or network error warnings
  const activeVisibleAlerts = (liveAlerts || []).filter((a) => {
    if (dismissedAlertIds.includes(a.id)) return false;
    const msg = (a.message || '').toLowerCase();
    if (msg.includes('failed to load') || msg.includes('failed to fetch') || msg.includes('typeerror')) {
      return false;
    }
    return true;
  });

  const currentAlert = activeVisibleAlerts[0];
  const isEmergency = Boolean(
    currentAlert &&
    (currentAlert.isEmergency ||
      currentAlert.severity === 'emergency' ||
      currentAlert.severity === 'critical' ||
      currentAlert.type === 'emergency')
  );

  const isAdmin = currentUser?.role === 'admin';

  const stopSirenSound = () => {
    setIsMuted(true);
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // ignore
      }
      audioCtxRef.current = null;
    }
  };

  useEffect(() => {
    if (isEmergency && !isMuted) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        let highPitch = true;
        const playBeep = () => {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(highPitch ? 880 : 660, ctx.currentTime);
            highPitch = !highPitch;

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.35);
          } catch {
            // Audio context restricted or closed
          }
        };

        playBeep();
        sirenIntervalRef.current = setInterval(playBeep, 450);
      } catch (e) {
        console.warn('Audio siren init warning:', e);
      }
    } else {
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {
          // ignore
        }
        audioCtxRef.current = null;
      }
    }

    return () => {
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {
          // ignore
        }
        audioCtxRef.current = null;
      }
    };
  }, [isEmergency, currentAlert?.id, isMuted]);

  if (!currentAlert) return null;

  const handleStopForMe = () => {
    stopSirenSound();
    dismissLocalAlert(currentAlert.id);
  };

  const handleClearSystemWide = async () => {
    stopSirenSound();
    await clearGlobalEmergencyBroadcast();
  };

  if (isEmergency) {
    return (
      <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 text-white px-4 py-3 shadow-lg border-b border-rose-800 relative z-50 animate-fadeIn">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden text-ellipsis whitespace-nowrap">
            <div className="p-2 rounded-xl bg-white/10 text-white shrink-0 border border-white/20 backdrop-blur-xs">
              <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="text-left text-xs sm:text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold uppercase tracking-wider bg-black/25 px-2.5 py-0.5 rounded-full text-[10px] border border-white/20">
                  Critical Emergency
                </span>
                {currentAlert.hall_number && (
                  <span className="font-mono text-[11px] bg-white/15 px-2 py-0.5 rounded-md border border-white/10">
                    Venue: {currentAlert.hall_number}
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-medium text-white/95 truncate max-w-xl">
                <strong className="font-bold">{currentAlert.title || 'Attention'}: </strong>
                {currentAlert.message}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] bg-white/10 px-2.5 py-1 rounded-full border border-white/15 shrink-0">
              <Radio className="w-3.5 h-3.5 text-rose-200 animate-ping" />
              <Clock className="w-3 h-3 text-rose-200" />
              <span>{currentAlert.time}</span>
            </div>

            {/* Direct STOP ALARM / Silence Siren Button */}
            {!isMuted ? (
              <button
                onClick={stopSirenSound}
                title="Silence emergency alarm sound"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <VolumeX className="w-3.5 h-3.5 text-slate-950" />
                <span>Silence Siren</span>
              </button>
            ) : (
              <span className="text-[11px] font-bold text-rose-100 bg-white/10 px-2.5 py-1 rounded-xl border border-white/15 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-rose-200" />
                Alarm Muted
              </span>
            )}

            {/* Individual Stop / Dismiss Button for Current User */}
            <button
              onClick={handleStopForMe}
              title="Dismiss alert for your session"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-rose-200" />
              <span>Dismiss</span>
            </button>

            {/* System-wide Clear Option (Admin Authority ONLY) */}
            {isAdmin && (
              <button
                onClick={handleClearSystemWide}
                title="Stop emergency broadcast for ALL users (Admin Authority Only)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-black text-amber-300 text-xs font-bold border border-amber-500/40 transition-all cursor-pointer shadow-sm"
              >
                <StopCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Stop All (Admin)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 via-amber-50/80 to-amber-100/60 border-b border-amber-200/80 px-4 py-2.5 shadow-2xs animate-fadeIn">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden text-ellipsis whitespace-nowrap">
          <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-800 shrink-0 border border-amber-300/40">
            {currentAlert.type === 'warning' ? (
              <AlertOctagon className="w-4 h-4 text-amber-700" />
            ) : (
              <Bell className="w-4 h-4 text-amber-700" />
            )}
          </div>
          <p className="text-xs sm:text-sm font-medium text-amber-900 truncate">
            <span className="font-bold text-amber-800 mr-2 bg-amber-200/60 px-2 py-0.5 rounded text-[11px] uppercase tracking-wide">
              Announcement
            </span>
            {currentAlert.message}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200 shrink-0 font-medium">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>{currentAlert.time}</span>
          </div>

          <button
            onClick={handleStopForMe}
            title="Dismiss announcement"
            className="p-1.5 rounded-lg text-amber-700 hover:text-amber-950 hover:bg-amber-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
