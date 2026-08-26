// agent-notes: { ctx: "Coordinator touch console with live attendance feed, student passcode guard and hall controls", deps: ["src/context/AppContext.jsx", "src/components/QRScannerModal.jsx", "src/components/PassCodeGuardModal.jsx", "src/components/StudentQRModal.jsx", "lucide-react"], state: "active", last: "antigravity@2026-07-31" }

import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import QRScannerModal from '../components/QRScannerModal';
import PassCodeGuardModal from '../components/PassCodeGuardModal';
import StudentQRModal from '../components/StudentQRModal';
import ViewRegisteredStudentsModal from '../components/ViewRegisteredStudentsModal';
import EmergencyBroadcastModal from '../components/EmergencyBroadcastModal';
import {
  Play,
  Clock,
  CheckSquare,
  Camera,
  Users,
  Bell,
  MapPin,
  UserCheck,
  CheckCircle2,
  Activity,
  Radio,
  QrCode,
  PlusCircle,
  Pencil,
  Trash2,
  FileText,
  Hash,
  Globe,
  StopCircle,
} from 'lucide-react';

export default function CoordinatorConsole() {
  const {
    events, fetchEvents, registrations, attendanceLogs, updateHallStatus,
    addEvent, updateEvent, deleteEvent, profilesList,
    liveAlerts, clearGlobalEmergencyBroadcast
  } = useApp();
  const [selectedHall, setSelectedHall] = useState('Hall 1 (Main Auditorium)');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [nudgeStatus, setNudgeStatus] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [selectedRosterEvent, setSelectedRosterEvent] = useState(null);

  // Passcode verification state for coordinator/admin viewing a student pass
  const [targetStudentForPass, setTargetStudentForPass] = useState(null);
  const [isGuardOpen, setIsGuardOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
    hall_number: selectedHall,
    start_time: '',
    end_time: '',
    max_capacity: 100,
  });

  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
    hall_number: '',
    start_time: '',
    end_time: '',
    max_capacity: 100,
  });

  // Available halls
  const halls = Array.from(new Set(events.map((e) => e.hall_number)));

  // Current active event in selected hall
  const activeEvent = events.find((e) => e.hall_number === selectedHall);

  // Registered students for this event
  const eventRegs = activeEvent ? registrations.filter((r) => r.event_id === activeEvent.id) : [];

  // Scanned in student IDs
  const checkedInStudentIds = activeEvent
    ? attendanceLogs
        .filter((log) => log.event_id === activeEvent.id && log.status === 'Checked-In')
        .map((log) => log.student_id)
    : [];

  // Missing students
  const missingRegs = eventRegs.filter((r) => !checkedInStudentIds.includes(r.student_id));

  // Live attendance log stream for active hall
  const liveHallLogs = activeEvent
    ? attendanceLogs.filter((log) => log.event_id === activeEvent.id || log.hall_number === selectedHall)
    : attendanceLogs;

  const handleStartEvent = () => {
    if (activeEvent) updateHallStatus(activeEvent.id, 'In Progress', 0);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_time || !formData.end_time) return;
    const result = await addEvent({
      ...formData,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString(),
      hall_number: formData.hall_number || selectedHall,
      max_capacity: Number(formData.max_capacity) || 100,
      max_seats: Number(formData.max_capacity) || 100,
    });
    if (result && result.success) {
      setShowAddModal(false);
      setFormData({
        title: '',
        description: '',
        category: 'Technical',
        hall_number: selectedHall,
        start_time: '',
        end_time: '',
        max_capacity: 100,
      });
    } else {
      console.error(`Event creation failed: ${result?.error?.message || 'Database insert error'}`);
    }
  };

  const handleEditClick = (evt) => {
    setEditingEvent(evt);
    setEditFormData({
      title: evt.title || '',
      description: evt.description || '',
      category: evt.category || 'Technical',
      hall_number: evt.hall_number || '',
      start_time: evt.start_time ? evt.start_time.slice(0, 16) : '',
      end_time: evt.end_time ? evt.end_time.slice(0, 16) : '',
      max_capacity: evt.max_capacity || evt.max_seats || 100,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;
    await updateEvent(editingEvent.id, {
      ...editFormData,
      max_seats: editFormData.max_capacity,
    });
    setShowEditModal(false);
    setEditingEvent(null);
  };

  const handleDeleteClick = async (evt) => {
    if (window.confirm(`Are you sure you want to permanently delete event "${evt.title}"?`)) {
      await deleteEvent(evt.id);
    }
  };

  const handleDelayEvent = () => {
    if (activeEvent) {
      const currentDelay = activeEvent.delay_minutes || 0;
      updateHallStatus(activeEvent.id, 'Delayed', currentDelay + 10);
    }
  };

  const handleEndEvent = () => {
    if (activeEvent) updateHallStatus(activeEvent.id, 'Completed', 0);
  };

  const handleNudgeMissing = (studentId) => {
    setNudgeStatus(`Sent Real-Time Routing Alert Nudge to Student ${studentId.slice(0, 8)}!`);
    setTimeout(() => setNudgeStatus(null), 3500);
  };

  const handleRequestStudentPass = (studentId) => {
    setTargetStudentForPass(studentId);
    setIsGuardOpen(true);
  };

  const handlePasscodeVerified = () => {
    setIsPassModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <UserCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Coordinator Touch Console
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            1-Touch Hall Control, Real-Time Delay Propagation & Embedded QR Door Scanner
          </p>
        </div>

        {/* Hall Selector & Create Event & Emergency Broadcast Button */}
        <div className="w-full md:w-auto flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {(liveAlerts || []).some((a) => a.isEmergency || a.severity === 'emergency' || a.type === 'emergency') && (
            <button
              onClick={async () => {
                await clearGlobalEmergencyBroadcast();
              }}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 border border-amber-500 animate-bounce"
              title="Stop emergency broadcast & silence alarms system-wide"
            >
              <StopCircle className="w-4 h-4 text-rose-700" />
              <span>🛑 Stop Emergency</span>
            </button>
          )}
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-rose-500"
          >
            <Radio className="w-4 h-4 text-white" />
            <span>Emergency Broadcast</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Create Event
          </button>
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={selectedHall}
              onChange={(e) => setSelectedHall(e.target.value)}
              className="w-full md:w-56 bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600 cursor-pointer shadow-2xs"
            >
              {halls.map((hall) => (
                <option key={hall} value={hall}>
                  {hall}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Console Layout */}
      {!activeEvent ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-500 text-xs">
          No active event mapped to {selectedHall}.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Event Info & One-Touch Action Buttons */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Event Status Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 uppercase bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                    {activeEvent.category} Track
                  </span>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 font-mono">
                    Registered: {eventRegs.length} / {activeEvent.max_capacity || activeEvent.max_seats || 100}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Current Status:</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {activeEvent.status}{' '}
                    {activeEvent.delay_minutes > 0 && `(+${activeEvent.delay_minutes}m Delay)`}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900">{activeEvent.title}</h2>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-semibold text-slate-700">{activeEvent.hall_number}</span>
                  <span>•</span>
                  <span>Max Seats: {activeEvent.max_capacity || activeEvent.max_seats || 100}</span>
                </p>
              </div>

              {/* Event Control & Roster Action Bar */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedRosterEvent(activeEvent);
                    setShowRosterModal(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200 shadow-2xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  View Registered Roster ({eventRegs.length})
                </button>
                <button
                  onClick={() => handleEditClick(activeEvent)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-600" />
                  Edit Event
                </button>
                <button
                  onClick={() => handleDeleteClick(activeEvent)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Delete Event
                </button>
              </div>

              {/* Attendance Progress bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Attendance Verified:</span>
                  <span className="text-indigo-700">
                    {checkedInStudentIds.length} / {eventRegs.length} Students Checked-In
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 border border-slate-200 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${eventRegs.length > 0 ? (checkedInStudentIds.length / eventRegs.length) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* One-Touch Control Panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-600" />
                One-Touch Real-Time Control Panel
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleStartEvent}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Start Event
                </button>

                <button
                  onClick={handleDelayEvent}
                  className="py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Clock className="w-5 h-5" />
                  Delay 10 Mins
                </button>

                <button
                  onClick={handleEndEvent}
                  className="py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-5 h-5" />
                  End Event
                </button>
              </div>

              {/* Embedded Camera Trigger */}
              <button
                onClick={() => setIsScannerOpen(true)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Launch Live Door Camera QR Scanner
              </button>
            </div>

            {/* Live Attendance Realtime Stream Feed */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Live Realtime Attendance Feed</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                  <span>Realtime Active</span>
                </div>
              </div>

              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {liveHallLogs.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    Waiting for live QR check-ins... Scans will appear instantly without page refresh.
                  </div>
                ) : (
                  liveHallLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs transition-colors hover:bg-slate-100/80"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            Student ID: {log.student_id?.slice(0, 14)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Hall: {log.hall_number || selectedHall}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          {log.status || 'Checked-In'}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                          {log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Missing Students Drawer */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Missing Students Drawer</h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                {missingRegs.length} Unscanned
              </span>
            </div>

            {nudgeStatus && (
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{nudgeStatus}</span>
              </div>
            )}

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {missingRegs.length === 0 ? (
                <div className="text-center py-8 text-xs text-emerald-700 font-semibold bg-emerald-50 rounded-xl border border-emerald-200 p-4">
                  All registered students checked in for this venue!
                </div>
              ) : (
                missingRegs.map((reg) => (
                  <div
                    key={reg.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs gap-2"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        Student ID: {reg.student_id.slice(0, 12)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Registered:{' '}
                        {new Date(reg.registered_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRequestStudentPass(reg.student_id)}
                        title="View Student Pass (Requires PIN)"
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Pass
                      </button>
                      <button
                        onClick={() => handleNudgeMissing(reg.student_id)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Bell className="w-3 h-3 text-amber-600" />
                        Nudge
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Camera Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        selectedHall={selectedHall}
      />

      {/* Passcode Verification Guard Modal for Coordinator / Admin */}
      <PassCodeGuardModal
        isOpen={isGuardOpen}
        onClose={() => setIsGuardOpen(false)}
        studentId={targetStudentForPass}
        studentName={targetStudentForPass?.slice(0, 12)}
        onSuccess={handlePasscodeVerified}
      />

      {/* Student Pass Preview Modal (Unlocked via PIN) */}
      <StudentQRModal
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        event={activeEvent}
      />

      {/* Create Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                Create New Symposium Event
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-900 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI & Robotics Keynote"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Description
                </label>
                <textarea
                  placeholder="Brief agenda or summary..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white resize-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Non-Technical">Non-Technical</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-amber-600" />
                    Max Capacity / Seats
                  </label>
                  <input
                    type="number"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  Assigned Hall / Venue
                </label>
                <input
                  type="text"
                  required
                  value={selectedHall}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 text-slate-600 rounded-xl px-3.5 py-2.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-xs cursor-pointer text-xs"
              >
                Save & Publish Event
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                Edit Event
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEvent(null);
                }}
                className="text-slate-400 hover:text-slate-900 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Non-Technical">Non-Technical</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Max Capacity / Seats</label>
                  <input
                    type="number"
                    value={editFormData.max_capacity}
                    onChange={(e) => setEditFormData({ ...editFormData, max_capacity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Assigned Hall / Venue</label>
                <input
                  type="text"
                  required
                  value={editFormData.hall_number}
                  onChange={(e) => setEditFormData({ ...editFormData, hall_number: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={editFormData.start_time}
                    onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={editFormData.end_time}
                    onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-xs cursor-pointer text-xs"
              >
                Update & Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Registered Students Roster Drawer Modal */}
      <ViewRegisteredStudentsModal
        isOpen={showRosterModal}
        onClose={() => setShowRosterModal(false)}
        event={selectedRosterEvent}
        registrations={registrations}
        profilesList={profilesList}
      />
      {/* Emergency Broadcast Modal */}
      <EmergencyBroadcastModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />
    </div>
  );
}
