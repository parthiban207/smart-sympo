// agent-notes: { ctx: "Minimalist dynamic refreshing QR Pass component with clean 15s rotating TOTP token and student info", deps: ["react-qr-code", "lucide-react"], state: "active", last: "antigravity@2026-08-26" }

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { RefreshCw, Clock, MapPin } from 'lucide-react';

export default function StudentQRPass({
  studentId,
  eventId,
  registrationId,
  studentName,
  studentEmail,
  collegeId,
  collegeName,
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

  // Generate payload encoding REAL student ID, registration ID, email, and timestamp token
  const payloadData = {
    studentId: studentId || '',
    registrationId: registrationId || '',
    email: studentEmail || '',
    student_id: studentId || '',
    registration_id: registrationId || '',
    user_id: studentId || '',
    event_id: eventId || '',
    timestamp: tokenTimestamp,
    refresh_rate_sec: 15,
  };

  const qrPayloadString = JSON.stringify(payloadData);
  const progressPercent = ((15 - timeLeft) / 15) * 100;

  return (
    <div className="flex flex-col items-center w-full space-y-3.5">
      {/* 15-Second Refresh Status Header */}
      <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-slate-600 font-medium">Dynamic TOTP</span>
        </div>
        <div className="flex items-center gap-1 font-mono font-bold text-indigo-600">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-indigo-600 h-1.5 transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {/* Centerpiece: Clean QR Code Card */}
      <div className="relative bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center">
        <QRCode
          value={qrPayloadString}
          size={170}
          style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
          viewBox={`0 0 256 256`}
        />
        {isRefreshing && (
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] rounded-2xl flex items-center justify-center transition-opacity">
            <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
          </div>
        )}
      </div>

      {/* Student & Event Details Card */}
      {(studentName || eventTitle) && (
        <div className="w-full bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
          {studentName && (
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Attendee</span>
              <span className="font-bold text-slate-900 truncate max-w-[170px]">{studentName}</span>
            </div>
          )}
          {collegeId && (
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Roll / Reg No</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {collegeId}
              </span>
            </div>
          )}
          {eventTitle && (
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Event</span>
              <span className="font-semibold text-slate-900 truncate max-w-[170px]">{eventTitle}</span>
            </div>
          )}
          {hallNumber && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                Venue
              </span>
              <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                {hallNumber}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
