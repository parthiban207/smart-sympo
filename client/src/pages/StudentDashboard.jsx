// agent-notes: { ctx: "Academic Symposium Programme & Paper Matrix with serif typography, parchment paper styling, paper ID badges, and TOTP entry pass modal", deps: ["src/context/AppContext.jsx", "src/components/StudentQRModal.jsx", "src/components/RegistrationSuccessModal.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import StudentQRModal from '../components/StudentQRModal';
import RegistrationSuccessModal from '../components/RegistrationSuccessModal';

import {
  Clock,
  MapPin,
  QrCode,
  CheckCircle2,
  AlertCircle,
  School,
  BookOpen,
  FileText,
  Bookmark,
} from 'lucide-react';

export default function StudentDashboard() {
  const { currentUser, events, fetchEvents, registrations, registerForEvent, unregisterForEvent } = useApp();
  const [selectedPassEvent, setSelectedPassEvent] = useState(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  if (!currentUser) return null;

  const studentRegIds = registrations
    .filter(
      (r) =>
        r.student_id === currentUser.id ||
        (r.student_email && currentUser.email && r.student_email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (r.student_username && currentUser.username && r.student_username.toLowerCase() === currentUser.username.toLowerCase())
    )
    .map((r) => r.event_id);

  const registeredEvents = events
    .filter((e) => studentRegIds.includes(e.id))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const availableEvents = events.filter((e) => !studentRegIds.includes(e.id));

  const handleRegister = async (eventId) => {
    const res = await registerForEvent(eventId);
    setFeedback(res);
    if (res?.success) {
      setSuccessModalData({
        event: res.event || events.find((e) => e.id === eventId),
        emailResult: res.emailResult,
        passToken: res.passToken,
      });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUnregister = async (eventId) => {
    const res = await unregisterForEvent(eventId);
    setFeedback(res);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleOpenQRPass = (event) => {
    setSelectedPassEvent(event);
    setIsQRModalOpen(true);
  };

  const formatTime = (isoStr) => {
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status, delayMins) => {
    if (delayMins > 0) {
      return (
        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Delayed ({delayMins}m)</span>
        </span>
      );
    }
    switch (status) {
      case 'In Progress':
        return (
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
            <span>Live Session</span>
          </span>
        );
      case 'Completed':
        return (
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Concluded
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Scheduled
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Academic Credential Header */}
      <div className="academic-card p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#E7E3D8] dark:border-[#2A2E38] relative overflow-hidden">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          <div className="w-14 h-14 rounded-lg bg-[#8B1E24] text-white flex items-center justify-center font-serif font-bold text-2xl shadow-xs shrink-0">
            {(currentUser.name || currentUser.full_name || 'A').charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-serif font-bold text-[#1E293B] dark:text-white tracking-tight">
                {currentUser.name || currentUser.full_name}
              </h1>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#8B1E24]/10 text-[#8B1E24] dark:bg-[#8B1E24]/20 dark:text-red-300 border border-[#8B1E24]/20">
                {currentUser.college_id}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Verified Delegate
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap font-medium">
              <span>{currentUser.email}</span>
              {currentUser.college && (
                <>
                  <span>•</span>
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1 font-serif">
                    <School className="w-3.5 h-3.5 text-slate-400" />
                    {currentUser.college}
                  </span>
                </>
              )}
              <span>•</span>
              <span className="text-[#8B1E24] dark:text-red-300 font-mono font-bold bg-[#8B1E24]/10 px-2 py-0.5 rounded">
                {registeredEvents.length} Registered Events
              </span>
            </p>
          </div>
        </div>

        {registeredEvents.length > 0 && (
          <button
            onClick={() => handleOpenQRPass(registeredEvents[0])}
            className="w-full md:w-auto px-5 py-3 bg-[#8B1E24] hover:bg-[#73181d] text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
          >
            <QrCode className="w-4 h-4" />
            <span>Symposium Entry Badge</span>
          </button>
        )}
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-xs font-medium border shadow-xs animate-fadeIn ${
            feedback.success
              ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 2. Distinctive Signature Moment: Symposium Programme & Paper Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Registered Session Matrix (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E3D8] dark:border-[#2A2E38] pb-3">
            <h2 className="text-xl font-serif font-bold text-[#1E293B] dark:text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#8B1E24] dark:text-red-400" />
              <span>My Schedule</span>
            </h2>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
              {registeredEvents.length} Registered Sessions
            </span>
          </div>

          {registeredEvents.length === 0 ? (
            <div className="academic-card p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-lg bg-[#8B1E24]/10 text-[#8B1E24] dark:text-red-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <p className="font-serif font-bold text-[#1E293B] dark:text-slate-200 text-lg">No events registered yet.</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browse available events on the right to register.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {registeredEvents.map((event, idx) => {
                const regCount = registrations.filter((r) => r.event_id === event.id).length;
                const maxCap = event.max_capacity || 100;
                const capPct = Math.min(100, Math.round((regCount / maxCap) * 100));
                const paperCode = `PAPER-${2026}-${String(idx + 1).padStart(2, '0')}`;

                return (
                  <div
                    key={event.id}
                    className="academic-card p-5 space-y-4 hover:border-[#8B1E24]/40 transition-all"
                  >
                    {/* Top Row: Paper Code, Category & Status */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {paperCode}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#8B1E24]/10 text-[#8B1E24] dark:bg-[#8B1E24]/20 dark:text-red-300 font-mono">
                            {event.category || 'Technical Session'}
                          </span>
                          {getStatusBadge(event.status, event.delay_minutes || 0)}
                        </div>

                        <h3 className="text-lg font-serif font-bold text-[#1E293B] dark:text-white tracking-tight mt-1">
                          {event.title}
                        </h3>
                      </div>

                      <button
                        onClick={() => handleOpenQRPass(event)}
                        className="px-3 py-1.5 rounded bg-[#8B1E24]/10 hover:bg-[#8B1E24]/20 text-[#8B1E24] dark:text-red-300 border border-[#8B1E24]/20 text-xs font-bold font-mono transition cursor-pointer shrink-0 flex items-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Entry Badge</span>
                      </button>
                    </div>

                    {/* Paper Abstract Preview */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                      {event.description}
                    </p>

                    {/* Meta Bar: Time, Hall, Occupancy & Actions */}
                    <div className="pt-3 border-t border-[#E7E3D8] dark:border-[#2A2E38] flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 flex-wrap gap-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1 font-mono text-[11px] font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#8B1E24] dark:text-red-400" />
                          {formatTime(event.start_time)} – {formatTime(event.end_time)}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[11px] font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {event.hall_number}
                        </span>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {capPct}% Filled ({regCount}/{maxCap})
                        </span>
                      </div>

                      <button
                        onClick={() => handleUnregister(event.id)}
                        className="text-[11px] font-mono text-rose-700 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                      >
                        Cancel Registration
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Open Proceedings & Enrolment (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E3D8] dark:border-[#2A2E38] pb-3">
            <h2 className="text-xl font-serif font-bold text-[#1E293B] dark:text-white tracking-tight flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <span>Browse Events</span>
            </h2>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
              {availableEvents.length} Available
            </span>
          </div>

          {availableEvents.length === 0 ? (
            <div className="academic-card p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-serif font-bold text-[#1E293B] dark:text-slate-200 text-sm">Registered for all available events.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {availableEvents.map((event) => {
                const regCount = registrations.filter((r) => r.event_id === event.id).length;
                const maxCap = event.max_capacity || 100;
                const isFull = regCount >= maxCap;

                return (
                  <div
                    key={event.id}
                    className="academic-card p-4 space-y-3 hover:border-slate-400 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {event.category || 'Technical Session'}
                        </span>
                        <h4 className="text-sm font-serif font-bold text-[#1E293B] dark:text-white">
                          {event.title}
                        </h4>
                      </div>

                      <button
                        onClick={() => handleRegister(event.id)}
                        disabled={isFull}
                        className={`px-3 py-1.5 rounded font-bold text-xs transition cursor-pointer shrink-0 font-mono shadow-xs ${
                          isFull
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-[#8B1E24] hover:bg-[#73181d] text-white'
                        }`}
                      >
                        {isFull ? 'Full' : 'Register'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-[#E7E3D8] dark:border-[#2A2E38]">
                      <span>{event.hall_number}</span>
                      <span>{formatTime(event.start_time)}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {regCount}/{maxCap} Seats
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Entry Pass Dialog */}
      {selectedPassEvent && (
        <StudentQRModal
          isOpen={isQRModalOpen}
          onClose={() => {
            setIsQRModalOpen(false);
            setSelectedPassEvent(null);
          }}
          event={selectedPassEvent}
          student={currentUser}
        />
      )}

      {/* Registration Success Dialog */}
      {successModalData && (
        <RegistrationSuccessModal
          isOpen={Boolean(successModalData)}
          onClose={() => setSuccessModalData(null)}
          event={successModalData.event}
          emailResult={successModalData.emailResult}
          passToken={successModalData.passToken}
          student={currentUser}
        />
      )}
    </div>
  );
}
