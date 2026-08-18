import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, AlertOctagon, Clock, ShieldAlert, Radio, X, StopCircle, VolumeX, Volume2 } from 'lucide-react';

export default function LiveAlertBanner() {
  const { liveAlerts, dismissedAlertIds, dismissLocalAlert, clearGlobalEmergencyBroadcast, currentUser } = useApp();
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  // Filter out alerts that this specific user has dismissed locally
  const activeVisibleAlerts = (liveAlerts || []).filter(
    (a) => !dismissedAlertIds.includes(a.id)
  );

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
      <div className="bg-rose-600 text-white px-4 py-2.5 shadow-lg border-b-2 border-rose-700 animate-pulse relative z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden text-ellipsis whitespace-nowrap">
            <div className="p-1.5 rounded-lg bg-rose-700 text-white shrink-0 shadow-xs border border-rose-500">
              <ShieldAlert className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div className="text-left text-xs sm:text-sm">
              <span className="font-extrabold uppercase tracking-wider bg-rose-800 px-2 py-0.5 rounded text-[10px] mr-2 border border-rose-500">
                CRITICAL EMERGENCY BROADCAST
              </span>
              <span className="font-bold">{currentAlert.title || 'EMERGENCY ALERT'}: </span>
              <span>{currentAlert.message}</span>
              {currentAlert.hall_number && (
                <span className="ml-2 font-mono text-[11px] bg-rose-900 px-2 py-0.5 rounded text-rose-200">
                  Venue: {currentAlert.hall_number}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 text-[11px] bg-rose-800/80 px-2.5 py-1 rounded-full border border-rose-500 shrink-0 font-medium">
              <Radio className="w-3.5 h-3.5 text-rose-200 animate-ping" />
              <Clock className="w-3 h-3 text-rose-200" />
              <span>{currentAlert.time}</span>
            </div>

            {/* Direct STOP ALARM / Silence Siren Button */}
            {!isMuted ? (
              <button
                onClick={stopSirenSound}
                title="Silence emergency alarm ringing sound"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold border border-amber-500 shadow-md transition cursor-pointer animate-bounce"
              >
                <VolumeX className="w-4 h-4 text-rose-800" />
                <span>STOP ALARM</span>
              </button>
            ) : (
              <span className="text-[11px] font-bold text-rose-200 bg-rose-800/80 px-2.5 py-1 rounded-lg border border-rose-500 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-rose-300" />
                Alarm Muted
              </span>
            )}

            {/* Individual Stop / Dismiss Button for Current User */}
            <button
              onClick={handleStopForMe}
              title="Dismiss alert for your session"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold border border-rose-500 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-rose-200" />
              <span>Dismiss (For Me)</span>
            </button>

            {/* System-wide Clear Option (Admin Authority ONLY) */}
            {isAdmin && (
              <button
                onClick={handleClearSystemWide}
                title="Stop emergency broadcast for ALL users (Admin Authority Only)"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-amber-300 text-xs font-bold border border-amber-500/50 transition cursor-pointer shadow-xs"
              >
                <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Stop All (Admin)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden text-ellipsis whitespace-nowrap">
          <div className="p-1 rounded-md bg-amber-100 text-amber-800 shrink-0">
            {currentAlert.type === 'warning' ? (
              <AlertOctagon className="w-4 h-4 text-amber-700" />
            ) : (
              <Bell className="w-4 h-4 text-amber-700" />
            )}
          </div>
          <p className="text-xs sm:text-sm font-medium text-amber-900 truncate">
            <span className="font-bold text-amber-800 mr-1.5">[SYSTEM ANNOUNCEMENT]</span>
            {currentAlert.message}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-100/60 px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0 font-medium">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>{currentAlert.time}</span>
          </div>

          <button
            onClick={handleStopForMe}
            title="Dismiss announcement for your screen"
            className="p-1 rounded-md text-amber-700 hover:text-amber-900 hover:bg-amber-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
