// agent-notes: { ctx: "Interactive registration success popup modal with automated email dispatch confirmation and instant QR pass shortcut", deps: ["lucide-react"], state: "active", last: "antigravity@2026-08-24" }

import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Mail,
  QrCode,
  Sparkles,
  X,
  Send,
  Building2,
  UserCheck
} from 'lucide-react';

export default function RegistrationSuccessModal({
  isOpen,
  onClose,
  event,
  student,
  emailResult,
  onOpenQRPass,
}) {
  if (!isOpen || !event) return null;

  const studentName = student?.full_name || student?.name || 'Student Attendee';
  const studentEmail = student?.email || 'your registered email';
  const collegeName = student?.college_name || student?.college || 'University Campus';

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
    return `${dateStr} • ${startStr}${endStr ? ` - ${endStr}` : ''}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 p-6 md:p-7 shadow-2xl relative text-left overflow-hidden space-y-5 animate-scaleUp">
        {/* Background celebration radial glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-100/50 rounded-full blur-2xl pointer-events-none -ml-10 -mt-10"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with celebration animation */}
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0 animate-bounce">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold tracking-wider uppercase bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Registration Confirmed
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
              🎉 Registration Successful!
            </h2>
          </div>
        </div>

        {/* Event Card Summary */}
        <div className="bg-slate-50/90 rounded-2xl border border-slate-200/90 p-4 space-y-3 relative z-10 shadow-2xs">
          <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-snug">
                {event.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                {event.description || 'Exclusive symposium interactive session and presentation.'}
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
              {event.category || 'Technical'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-semibold truncate">{event.hall_number || 'Main Venue'}</span>
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-medium truncate text-[11px]">
                {formatEventTime(event.start_time, event.end_time)}
              </span>
            </div>
          </div>
        </div>

        {/* Automated Email Confirmation Banner */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 flex items-start gap-3 relative z-10 text-xs">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs mt-0.5">
            <Mail className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-indigo-950 flex items-center gap-1.5">
              <span>Automated Email Dispatched</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              A confirmation email with your event pass details has been dispatched to{' '}
              <span className="font-bold text-indigo-900 underline">{studentEmail}</span>.
            </p>
            {emailResult?.params?.pass_token && (
              <div className="text-[10px] text-indigo-700 font-mono font-semibold pt-1">
                Pass Ref Token: {emailResult.params.pass_token}
              </div>
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
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>View Dynamic QR Pass</span>
          </button>

          <button
            onClick={onClose}
            className="sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
