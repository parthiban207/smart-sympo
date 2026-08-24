import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { isValidUUID } from '../supabaseClient';
import StudentQRModal from '../components/StudentQRModal';
import RegistrationSuccessModal from '../components/RegistrationSuccessModal';

import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function StudentDashboard() {
  const { currentUser, events, registrations, registerForEvent, unregisterForEvent } = useApp();
  const [selectedPassEvent, setSelectedPassEvent] = useState(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [feedback, setFeedback] = useState(null);

  if (!currentUser) return null;

  // Get event details for student's registered events
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
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
          Delayed ({delayMins}m)
        </span>
      );
    }
    switch (status) {
      case 'In Progress':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Live Now
          </span>
        );
      case 'Completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Scheduled
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Profile Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-xs">
            {(currentUser.name || currentUser.full_name || 'S').charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{currentUser.name || currentUser.full_name}</h1>
              <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold">
                {currentUser.college_id}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Verified Active
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <span>{currentUser.email}</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">
                {registeredEvents.length} Registered Events
              </span>
            </p>
          </div>
        </div>

        {registeredEvents.length > 0 && (
          <button
            onClick={() => handleOpenQRPass(registeredEvents[0])}
            className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            My Dynamic QR Entry Pass
          </button>
        )}
      </div>

      {/* Registration Feedback Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-semibold shadow-xs ${
            feedback.success
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Dynamic Agenda Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Personal Dynamic Timeline Agenda
            </h2>
            <span className="text-xs text-slate-500 font-mono">Sorted by Start Time</span>
          </div>

          {registeredEvents.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No events registered yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore available symposium tracks on the right to register for events without time
                conflicts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {registeredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                        {evt.category}
                      </span>
                      {getStatusBadge(evt.status, evt.delay_minutes)}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{evt.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <div className="flex items-center gap-1 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-semibold">{evt.hall_number}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {formatTime(evt.start_time)} - {formatTime(evt.end_time)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleOpenQRPass(evt)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Show Pass
                    </button>
                    <button
                      onClick={() => handleUnregister(evt.id)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Unregister from this event"
                    >
                      Unregister
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Symposium Event Directory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Symposium Tracks
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">Clash Engine Active</span>
          </div>

          <div className="space-y-3">
            {availableEvents.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500 shadow-xs">
                You are registered for all available symposium events!
              </div>
            ) : (
              availableEvents.map((evt) => {
                const regCount = registrations.filter((r) => r.event_id === evt.id).length;
                const capacity = evt.max_capacity || evt.max_seats || 100;
                const isFull = regCount >= capacity;

                return (
                  <div
                    key={evt.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-2.5"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {evt.category}
                      </span>
                      {isFull ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-mono flex items-center gap-1">
                          <Lock className="w-3 h-3 text-rose-600" />
                          {regCount}/{capacity} Seats Filled
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                          {regCount} / {capacity} Seats
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{evt.title}</h4>

                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />
                        <span>{evt.hall_number}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatTime(evt.start_time)} - {formatTime(evt.end_time)}
                        </span>
                      </div>
                    </div>

                    {isFull ? (
                      <button
                        disabled={isFull}
                        className="w-full mt-2 py-2 bg-slate-200 text-slate-500 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-300"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Event Full
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegister(evt.id)}
                        disabled={!evt || !evt.id}
                        className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Register Track
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Registration Success Interactive Modal */}
      <RegistrationSuccessModal
        isOpen={Boolean(successModalData)}
        onClose={() => setSuccessModalData(null)}
        event={successModalData?.event}
        student={currentUser}
        emailResult={successModalData?.emailResult}
        onOpenQRPass={handleOpenQRPass}
      />

      {/* QR Pass Modal */}
      <StudentQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        event={selectedPassEvent}
      />
    </div>
  );
}
