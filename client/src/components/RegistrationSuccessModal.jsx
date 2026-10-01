import { useState } from 'react';
import {
  Clock,
  MapPin,
  Mail,
  QrCode,
  Sparkles,
  X,
  ExternalLink,
  Check,
  Send,
  RefreshCw,
} from 'lucide-react';
import { sendEventConfirmationApi } from '../services/backendEmailService';

export default function RegistrationSuccessModal({
  isOpen,
  onClose,
  event,
  student,
  emailResult,
  onOpenQRPass,
  passToken: directPassToken = null,
}) {
  const [customEmail, setCustomEmail] = useState('');
  const [isSendingCustom, setIsSendingCustom] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState('');
  const [sendErrorMessage, setSendErrorMessage] = useState('');
  if (!isOpen || !event) return null;

  const studentEmail = student?.email || 'your registered email';

  const formatEventTime = (startTime, endTime) => {
    if (!startTime) return 'Scheduled Time';
    const dateStr = new Date(startTime).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const startStr = new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endStr = endTime
      ? new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    return `${dateStr} • ${startStr}${endStr ? ` – ${endStr}` : ''}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200/90 p-7 shadow-2xl relative text-left overflow-hidden space-y-5 animate-slideUp">
        {/* Background celebration radial glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-100/40 rounded-full blur-2xl pointer-events-none -ml-10 -mt-10"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with celebration animation */}
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 animate-bounce">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold tracking-wider uppercase bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Registration Confirmed
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
              Registration Successful!
            </h2>
          </div>
        </div>

        {/* Event Card Summary */}
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4.5 space-y-3 relative z-10 shadow-2xs">
          <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base leading-snug">
                {event.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                {event.description || 'Exclusive symposium interactive session and presentation.'}
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
              {event.category || 'Technical'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold truncate">{event.hall_number || 'Main Venue'}</span>
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium truncate text-[11px]">
                {formatEventTime(event.start_time, event.end_time)}
              </span>
            </div>
          </div>
        </div>

        {/* Automated Email Confirmation Banner */}
        <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 space-y-3 relative z-10 text-xs shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs mt-0.5">
              <Mail className="w-4 h-4" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-indigo-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>Confirmation Dispatched</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                </span>
                <a
                  href="https://mail.google.com/mail/u/0/#search/SmartSympo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 shadow-2xs transition"
                >
                  <ExternalLink className="w-3 h-3 text-indigo-600" />
                  <span>Open Gmail</span>
                </a>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                A confirmation receipt with your dynamic pass details has been dispatched to{' '}
                <span className="font-bold text-indigo-900 underline">{studentEmail}</span>.
              </p>
              {(directPassToken || emailResult?.params?.pass_token) && (
                <div className="text-[10px] text-indigo-700 font-mono font-semibold pt-0.5">
                  Pass Token: {directPassToken || emailResult?.params?.pass_token}
                </div>
              )}
            </div>
          </div>

          {/* Quick Resend / Forward to Real Gmail */}
          <div className="pt-2 border-t border-indigo-200/60">
            <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Send copy to your personal Gmail:</span>
              {sendSuccessMessage && (
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Sent!
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="email"
                placeholder="e.g. yourname@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 font-medium"
              />
              <button
                type="button"
                disabled={isSendingCustom || !customEmail.trim()}
                onClick={async () => {
                  if (!customEmail.trim() || !customEmail.includes('@')) {
                    setSendErrorMessage('Please enter a valid email address.');
                    return;
                  }
                  setIsSendingCustom(true);
                  setSendSuccessMessage('');
                  setSendErrorMessage('');
                  try {
                    const token = directPassToken || emailResult?.params?.pass_token || `PASS-${Date.now().toString(36).toUpperCase()}`;
                    const res = await sendEventConfirmationApi({
                      email: customEmail.trim(),
                      name: student?.full_name || student?.name || 'Student Delegate',
                      eventName: event.title,
                      category: event.category || 'General',
                      venue: event.hall_number || 'Main Venue',
                      timeSlot: formatEventTime(event.start_time, event.end_time),
                      eventDate: new Date(event.start_time || Date.now()).toLocaleDateString('en-US', { dateStyle: 'long' }),
                      passToken: token,
                      roll_no: student?.roll_no || student?.college_id || 'STU-2026',
                      collegeName: student?.college || 'Symposium Campus',
                    });
                    if (res?.success) {
                      setSendSuccessMessage(`Pass sent to ${customEmail}!`);
                      setCustomEmail('');
                    } else {
                      setSendErrorMessage(res?.error || 'Failed to dispatch email.');
                    }
                  } catch (err) {
                    setSendErrorMessage(err?.message || 'Error sending pass.');
                  } finally {
                    setIsSendingCustom(false);
                  }
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isSendingCustom ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send</span>
              </button>
            </div>
            {sendErrorMessage && (
              <p className="text-[10px] text-rose-500 font-semibold mt-1">{sendErrorMessage}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1 relative z-10">
          <button
            onClick={() => {
              onClose();
              if (onOpenQRPass) onOpenQRPass(event);
            }}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <QrCode className="w-4 h-4" />
            <span>View Dynamic QR Pass</span>
          </button>

          <button
            onClick={onClose}
            className="sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
