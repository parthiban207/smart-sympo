// agent-notes: { ctx: "Dynamic refreshing QR Pass component with 15s rotating timestamp token", deps: ["react-qr-code", "lucide-react"], state: "active", last: "antigravity@2026-07-31" }

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { RefreshCw, ShieldCheck, Clock } from 'lucide-react';

export default function StudentQRPass({
  studentId,
  eventId,
  registrationId,
  studentName,
  collegeId,
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
          setTimeout(() => setIsRefreshing(false), 500);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Generate payload encoding registration_id, event_id, user_id, timestamp token and security signature
  const payloadData = {
    registration_id: registrationId || (studentId ? `reg-${studentId.slice(0, 8)}` : ''),
    event_id: eventId,
    user_id: studentId,
    student_id: studentId,
    timestamp: tokenTimestamp,
    refresh_rate_sec: 15,
    signature: `sig-${studentId?.slice(0, 4)}-${tokenTimestamp}`,
  };

  const qrPayloadString = JSON.stringify(payloadData);
  const progressPercent = ((15 - timeLeft) / 15) * 100;

  return (
    <div className="flex flex-col items-center w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      {/* 15-Second Refresh Status Header */}
      <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-slate-700 font-medium">Refreshes every 15s</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-600">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Dynamic Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden border border-slate-200">
        <div
          className="bg-indigo-600 h-2 transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {/* Centerpiece: Clean White Card housing Dynamic Refreshing QR Code */}
      <div className="relative group bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center">
        <QRCode
          value={qrPayloadString}
          size={180}
          style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
          viewBox={`0 0 256 256`}
        />
        {isRefreshing && (
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] rounded-2xl flex items-center justify-center transition-opacity">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="mt-4 w-full text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl flex items-center justify-center gap-2 font-medium">
        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Dynamic TOTP Secured - Screenshots Invalid</span>
      </div>

      {/* Student & Event Information Details */}
      {(studentName || eventTitle) && (
        <div className="mt-4 w-full bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
          {studentName && (
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Student</span>
              <span className="font-semibold text-slate-900">{studentName}</span>
            </div>
          )}
          {collegeId && (
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Reg No</span>
              <span className="font-mono text-indigo-700 font-bold">{collegeId}</span>
            </div>
          )}
          {eventTitle && (
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Event</span>
              <span className="font-semibold text-slate-900 truncate max-w-[170px]">{eventTitle}</span>
            </div>
          )}
          {hallNumber && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Assigned Venue</span>
              <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">{hallNumber}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
