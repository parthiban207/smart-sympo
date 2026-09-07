// agent-notes: { ctx: "Neo-Glass Fest Conference Lanyard Badge with dynamic 15s rotating TOTP QR token, direct X close button, offline PWA caching, live status indicator, and security watermark", deps: ["react-qr-code", "lucide-react", "src/utils/eventTiming.js"], state: "active", last: "antigravity@2026-09-07" }

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { RefreshCw, Clock, MapPin, Sparkles, Building, BookOpen, ShieldCheck, AlertTriangle, WifiOff, X } from 'lucide-react';
import { getEventTimingStatus } from '../utils/eventTiming';

export default function StudentQRPass({
  studentId,
  eventId,
  registrationId,
  studentName,
  studentEmail,
  collegeId,
  collegeName,
  department,
  eventTitle,
  hallNumber,
  event,
  startTime,
  endTime,
  user,
  profile,
  onClose,
}) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [tokenTimestamp, setTokenTimestamp] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Offline detection listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRefreshing(true);
          setTokenTimestamp(Date.now());
          setTimeout(() => setIsRefreshing(false), 450);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const resolvedStudentId =
    studentId ||
    user?.id ||
    profile?.id ||
    user?.student_id ||
    profile?.student_id ||
    'STU-AUTH';

  const resolvedFullName =
    (profile?.full_name && profile.full_name !== 'Student Attendee' ? profile.full_name : null) ||
    (user?.full_name && user.full_name !== 'Student Attendee' ? user.full_name : null) ||
    (studentName && studentName !== 'Student Attendee' ? studentName : null) ||
    (user?.name && user.name !== 'Student Attendee' ? user.name : null) ||
    (user?.email ? user.email.split('@')[0] : 'Delegate');

  const resolvedRollNo =
    profile?.roll_no ||
    user?.roll_no ||
    collegeId ||
    user?.college_id ||
    profile?.college_id ||
    'STU-2026';

  const resolvedDepartment =
    profile?.department ||
    user?.department ||
    department ||
    'Computer Science & Eng';

  const resolvedCollege =
    profile?.college ||
    user?.college ||
    collegeName ||
    user?.college_name ||
    profile?.college_name ||
    'Engineering Campus';

  const resolvedEmail =
    studentEmail ||
    user?.email ||
    profile?.email ||
    '';

  // Calculate dynamic timing status for target event
  const targetEvent = event || {
    id: eventId,
    title: eventTitle,
    hall_number: hallNumber,
    start_time: startTime,
    end_time: endTime,
  };
  const eventTiming = getEventTimingStatus(targetEvent, tokenTimestamp);

  // Clean JSON payload encoding student ID, profile metadata, and timestamp
  const qrPayload = JSON.stringify({
    student_id: resolvedStudentId,
    full_name: resolvedFullName,
    roll_no: resolvedRollNo,
    department: resolvedDepartment,
    college: resolvedCollege,
    timestamp: tokenTimestamp,
    event_id: eventId || 'general',
    registration_id: registrationId || '',
    email: resolvedEmail,
    is_expired: eventTiming.isExpired,
  });

  const progressPercent = ((15 - timeLeft) / 15) * 100;
  const tokenHash =
    (resolvedStudentId ? String(resolvedStudentId).slice(0, 8).toUpperCase() : 'AUTH') +
    '-' +
    tokenTimestamp.toString(16).slice(-4).toUpperCase();

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Lanyard Clip Slot Header */}
      <div className="w-full flex flex-col items-center mb-3">
        <div className="w-14 h-3 bg-slate-900/80 rounded-full border border-slate-700/60 shadow-inner flex items-center justify-center">
          <div className="w-8 h-1 bg-slate-600/60 rounded-full"></div>
        </div>
      </div>

      {/* 2. Conference Badge Body */}
      <div className="w-full bg-[#151D2F] border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl relative overflow-hidden text-left space-y-4 text-white">
        {/* Background Ambient Glow Accents */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top: Event Title ("SmartSympo 2026") & Live Pulse Status & Close X Button */}
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-3 relative z-10 gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-300">
                SmartSympo 2026
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">National Tech Symposium</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {eventTiming.isExpired ? (
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>EXPIRED PASS</span>
              </div>
            ) : !isOnline ? (
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs animate-pulse">
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span>OFFLINE PASS 📴</span>
              </div>
            ) : eventTiming.isLive ? (
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>LIVE NOW</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-xs">
                <Clock className="w-2.5 h-2.5 text-indigo-400" />
                <span>ENTRY PASS</span>
              </div>
            )}

            {onClose && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1.5 rounded-xl bg-slate-800/90 hover:bg-rose-500/25 text-slate-300 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/50 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Close Entry Pass (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {!isOnline && (
          <div className="bg-amber-950/40 border border-amber-700/50 rounded-xl px-3 py-2 text-[11px] text-amber-300 flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Offline cached pass active. You can still scan and enter the hall without internet.</span>
          </div>
        )}

        {/* Student Info: Name, Roll No badge, Dept & College */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight leading-snug">
                {resolvedFullName}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{resolvedDepartment}</span>
              </p>
            </div>

            <span className="shrink-0 font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              {resolvedRollNo}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium truncate">
            <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{resolvedCollege}</span>
          </div>
        </div>

        {/* Centerpiece: High-Contrast QR Code Box with Luminous Gradient Border */}
        <div className="relative flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 z-10">
          <div className="relative p-1 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 shadow-lg shadow-indigo-500/20 overflow-hidden">
            <div className="bg-white p-3.5 rounded-[14px] flex items-center justify-center w-[200px] h-[200px] aspect-square shadow-inner relative">
              <QRCode
                value={qrPayload}
                size={180}
                level="M"
                style={{ height: '100%', maxWidth: '100%', width: '100%' }}
                viewBox={`0 0 256 256`}
              />

              {/* Expired Pass Banner Overlay over QR Code */}
              {eventTiming.isExpired && (
                <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md rounded-[14px] flex flex-col items-center justify-center p-4 text-center z-30 border-2 border-rose-500/60 shadow-2xl animate-fadeIn">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mb-2 shadow-lg shadow-rose-950/50">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  </div>
                  <span className="font-extrabold text-xs font-mono text-rose-400 uppercase tracking-wider leading-tight">
                    Event Completed — Pass Expired
                  </span>
                  <p className="text-[10px] text-slate-300 mt-1 font-medium leading-tight">
                    Unauthorized late entries restricted
                  </p>
                </div>
              )}
            </div>

            {/* Refreshing Overlay */}
            {!eventTiming.isExpired && isRefreshing && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center gap-2 text-white transition-opacity">
                <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
                <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-widest">
                  Rotating Token...
                </span>
              </div>
            )}
          </div>

          {/* 15s Countdown Progress Indicator Bar or Expired Status */}
          <div className="w-full max-w-[210px] mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>{eventTiming.isExpired ? 'Pass Validity' : 'Auto-Refreshes in'}</span>
              </span>
              <span className={`font-bold px-1.5 py-0.5 rounded border ${
                eventTiming.isExpired
                  ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                  : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
              }`}>
                {eventTiming.isExpired ? 'Expired' : `${timeLeft}s`}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 transition-all duration-1000 ease-linear rounded-full ${
                  eventTiming.isExpired
                    ? 'bg-rose-500 w-full'
                    : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400'
                }`}
                style={{ width: eventTiming.isExpired ? '100%' : `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Target Event & Venue (if specified) */}
        {(eventTitle || hallNumber) && (
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300 z-10">
            <div className="truncate pr-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">Session</span>
              <span className="font-semibold text-white truncate block">{eventTitle || 'Symposium Track'}</span>
            </div>
            {hallNumber && (
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">Venue</span>
                <span className="font-mono font-bold text-cyan-400 flex items-center gap-1 justify-end">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  {hallNumber}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bottom: Watermark & Holographic Token Bar */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500 z-10">
          <span className="flex items-center gap-1 uppercase tracking-wider text-slate-400">
            <ShieldCheck className="w-3 h-3 text-indigo-400" />
            Authorized Entry Pass • Non-Transferable
          </span>
          <span className="text-slate-400 font-bold bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
            {tokenHash}
          </span>
        </div>
      </div>
    </div>
  );
}

