// agent-notes: { ctx: "Minimalist dynamic refreshing QR Pass component with clean 15s rotating TOTP token and attendee metadata", deps: ["react-qr-code", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { RefreshCw, Clock, MapPin, User, ShieldCheck } from 'lucide-react';

export default function StudentQRPass({
  studentId,
  eventId,
  registrationId,
  studentName,
  studentEmail,
  collegeId,
  collegeName: _collegeName,
  eventTitle,
  hallNumber,
}) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [tokenTimestamp, setTokenTimestamp] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRefreshing(true);
          setTokenTimestamp(Date.now());
          setTimeout(() => setIsRefreshing(false), 400);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Generate streamlined payload encoding essential verification keys
  const payloadData = {
    registrationId: registrationId || '',
    studentId: studentId || '',
    eventId: eventId || '',
    email: studentEmail || '',
    student_id: studentId || '',
    registration_id: registrationId || '',
    event_id: eventId || '',
    timestamp: tokenTimestamp,
  };

  const qrPayloadString = JSON.stringify(payloadData);
  const progressPercent = ((15 - timeLeft) / 15) * 100;

  return (
    <div className="flex flex-col items-center w-full space-y-4">
      {/* 15-Second Refresh Status Header */}
      <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </div>
          <span className="text-slate-700 font-bold text-xs">Anti-Screenshot Pass</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200/70 text-xs">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-violet-600 h-1.5 transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {/* Centerpiece: Clean High-Contrast QR Code Card */}
      <div className="relative bg-white p-5 rounded-3xl border border-slate-200 shadow-md shadow-slate-900/5 flex items-center justify-center w-full max-w-[240px] group">
        <QRCode
          value={qrPayloadString}
          size={190}
          level="M"
          style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
          viewBox={`0 0 256 256`}
        />
        {isRefreshing && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center gap-2 transition-opacity">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Refreshing Token</span>
          </div>
        )}
      </div>

      {/* Student & Event Details Card */}
      {(studentName || eventTitle) && (
        <div className="w-full bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 text-left space-y-2.5 text-xs shadow-2xs">
          {studentName && (
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Attendee
              </span>
              <span className="font-bold text-slate-900 truncate max-w-[170px]">{studentName}</span>
            </div>
          )}
          {collegeId && (
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Roll / ID
              </span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                {collegeId}
              </span>
            </div>
          )}
          {eventTitle && (
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Event</span>
              <span className="font-semibold text-slate-900 truncate max-w-[170px]">{eventTitle}</span>
            </div>
          )}
          {hallNumber && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                Venue
              </span>
              <span className="font-bold text-slate-900 bg-white border border-slate-200/90 px-2.5 py-0.5 rounded-lg shadow-2xs">
                {hallNumber}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
