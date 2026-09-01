// agent-notes: { ctx: "Neo-glass Session Details Modal displaying comprehensive symposium track info, speaker details, live capacity bar, room directions, and calendar export", deps: ["lucide-react", "src/utils/calendarExport.js"], state: "active", last: "antigravity@2026-09-01" }

import { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  QrCode,
  CheckCircle2,
  Share2,
  CalendarPlus,
  BookOpen,
  Info,
  Navigation,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { generateEventICS, downloadICSFile } from '../utils/calendarExport';

export default function SessionDetailsModal({
  isOpen,
  onClose,
  event,
  isRegistered,
  onRegister,
  onUnregister,
  onOpenPass,
  regCount = 0,
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !event) return null;

  const maxCap = event.max_capacity || 100;
  const isFull = regCount >= maxCap;
  const capPct = Math.min(100, Math.round((regCount / maxCap) * 100));

  const formatTime = (isoStr) => {
    if (!isoStr) return '--:--';
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'Symposium Day';
    return new Date(isoStr).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleExportICS = () => {
    const icsData = generateEventICS(event);
    const sanitizedTitle = (event.title || 'session')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    downloadICSFile(`smart-sympo-${sanitizedTitle}.ics`, icsData);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/student?session=${event.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F19]/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white dark:bg-[#121620] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-4 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-cyan-50/50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-cyan-950/30">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {event.category || 'Technical Session'}
              </span>
              {isRegistered ? (
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Enrolled
                </span>
              ) : (
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {isFull ? 'Sold Out' : 'Registration Open'}
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
              {event.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-700 dark:text-slate-300">
          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Schedule
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {formatTime(event.start_time)} – {formatTime(event.end_time)}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {formatDate(event.start_time)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                Venue & Hall
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {event.hall_number || 'Main Auditorium'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Campus Tech Block
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-500" />
                Live Occupancy
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {regCount} / {maxCap} Seats
              </p>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full transition-all duration-500 ${
                    capPct >= 90
                      ? 'bg-rose-500'
                      : capPct >= 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${capPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Session Overview */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span>Session Overview & Abstract</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
              {event.description ||
                'This symposium session features comprehensive presentations, hands-on demonstrations, and paper discussions delivered by leading domain experts and researchers.'}
            </p>
          </div>

          {/* Venue & Hall Directions Guidance */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent border border-cyan-500/20 space-y-2">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-cyan-500" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Hall Navigation Guidance
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Located at <strong className="text-slate-900 dark:text-slate-200">{event.hall_number || 'Main Auditorium'}</strong>. Please arrive 10 minutes prior to session commencement with your TOTP digital pass ready on your screen for express QR check-in.
            </p>
          </div>

          {/* Delegate Benefits & Certificate Points */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Symposium Certificate Credit</p>
                <p className="text-[11px] text-slate-500">Qualifies toward verified participation certificate</p>
              </div>
            </div>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
              +25 Pts
            </span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Add to Calendar (.ics) */}
            <button
              onClick={handleExportICS}
              title="Add to Google/Apple/Outlook Calendar"
              className="px-3.5 py-2 rounded-xl text-xs font-bold font-mono bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4 text-indigo-500" />
              <span>Add to Calendar</span>
            </button>

            {/* Share / Copy Link */}
            <button
              onClick={handleCopyLink}
              title="Copy session link"
              className="px-3.5 py-2 rounded-xl text-xs font-bold font-mono bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-cyan-500" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isRegistered ? (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onOpenPass && onOpenPass(event);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-indigo-500/25"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Digital Pass</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onUnregister && onUnregister(event.id);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition cursor-pointer"
                >
                  Cancel Registration
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onRegister && onRegister(event.id);
                }}
                disabled={isFull}
                className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md ${
                  isFull
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isFull ? 'Session Full' : 'Register for Track'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
