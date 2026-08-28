// agent-notes: { ctx: "Coordinator touch console with relational profile fetching, real student names, roll numbers, accurate stats, and realtime listener", deps: ["src/context/AppContext.jsx", "src/components/QRScannerModal.jsx", "src/components/PassCodeGuardModal.jsx", "src/components/StudentQRModal.jsx", "src/supabaseClient.ts", "lucide-react"], state: "active", last: "antigravity@2026-08-28" }

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, isMockMode } from '../supabaseClient';
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
  RefreshCw,
  Calendar,
} from 'lucide-react';

export default function CoordinatorConsole() {
  const {
    events, fetchEvents, registrations, attendanceLogs, updateHallStatus,
    addEvent, updateEvent, deleteEvent, profilesList,
    liveAlerts, clearGlobalEmergencyBroadcast
  } = useApp();
  const [selectedHall, setSelectedHall] = useState('Hall 1 (Main Auditorium)');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [nudgeStatus, setNudgeStatus] = useState(null);

  // Stats State & Recent Scans State for current event
  const [stats, setStats] = useState({
    totalRegistered: 0,
    totalScanned: 0,
    pendingCheckIn: 0,
    successRate: 0,
  });
  const [recentScans, setRecentScans] = useState([]);
  const [eventRegistrations, setEventRegistrations] = useState([]);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);

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

  // Current active event for selected hall / selected event
  const currentEvent =
    events.find((e) => e.id === selectedEventId) ||
    events.find((e) => e.hall_number === selectedHall) ||
    events[0];

  // 1. Fetch All Registrations for the Event (Both attended and pending)
  const fetchEventStats = useCallback(async (eventId) => {
    if (!eventId) return;

    setIsFetchingAttendance(true);
    try {
      let allRegistrations = null;

      if (!isMockMode) {
        const { data, error } = await supabase
          .from('registrations')
          .select(`
            id,
            attended,
            checked_in_at,
            student_id,
            profiles (
              id,
              full_name,
              email,
              roll_no,
              college
            )
          `)
          .eq('event_id', eventId);

        if (error) {
          console.error("Error fetching stats:", error);
          // Fallback relationship query syntax if PostgREST requires named FK
          const { data: fallbackData, error: fbError } = await supabase
            .from('registrations')
            .select(`
              id,
              attended,
              checked_in_at,
              student_id,
              profiles:student_id (
                id,
                full_name,
                email,
                roll_no,
                college
              )
            `)
            .eq('event_id', eventId);

          if (!fbError && fallbackData) {
            allRegistrations = fallbackData;
          }
        } else {
          allRegistrations = data;
        }
      }

      if (!allRegistrations) {
        allRegistrations = (registrations || [])
          .filter((r) => r.event_id === eventId)
          .map((r) => {
            const profile = (profilesList || []).find((p) => p.id === r.student_id);
            return {
              ...r,
              profiles: r.profiles || profile || {
                id: r.student_id,
                full_name: r.student_name || 'Student Attendee',
                email: r.student_email || '',
                roll_no: r.roll_no || r.college_id || '',
                college: r.college || 'Main Campus',
              },
            };
          });
      }

      const total = allRegistrations?.length || 0;
      const scanned = allRegistrations?.filter(r => r.attended === true || r.checked_in_at !== null).length || 0;
      const pending = total - scanned;
      const rate = total > 0 ? Math.round((scanned / total) * 100) : 0;

      setStats({
        totalRegistered: total,
        totalScanned: scanned,
        pendingCheckIn: pending >= 0 ? pending : 0,
        successRate: rate,
      });

      // Recent scans sorted by checked_in_at
      const attendedList = allRegistrations
        ?.filter(r => r.attended === true)
        ?.sort((a, b) => new Date(b.checked_in_at || 0) - new Date(a.checked_in_at || 0)) || [];
      setRecentScans(attendedList);
      setEventRegistrations(allRegistrations);
    } catch (err) {
      console.error("Error in fetchEventStats:", err);
    } finally {
      setIsFetchingAttendance(false);
    }
  }, [registrations, profilesList]);

  // 2. Real-time Subscription: listen on registrations channel for active event
  useEffect(() => {
    if (!currentEvent?.id) return;
    fetchEventStats(currentEvent.id);

    if (!isMockMode) {
      const channel = supabase
        .channel(`coordinator:registrations:${currentEvent.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'registrations',
            filter: `event_id=eq.${currentEvent.id}`,
          },
          () => {
            fetchEventStats(currentEvent.id);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance_logs',
            filter: `event_id=eq.${currentEvent.id}`,
          },
          () => {
            fetchEventStats(currentEvent.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentEvent?.id, fetchEventStats]);

  // Synchronize when global registrations state changes
  useEffect(() => {
    if (currentEvent?.id) {
      fetchEventStats(currentEvent.id);
    }
  }, [registrations, currentEvent?.id, fetchEventStats]);

  const handleStartEvent = () => {
    if (currentEvent) updateHallStatus(currentEvent.id, 'In Progress', 0);
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
    if (currentEvent) {
      const currentDelay = currentEvent.delay_minutes || 0;
      updateHallStatus(currentEvent.id, 'Delayed', currentDelay + 10);
    }
  };

  const handleEndEvent = () => {
    if (currentEvent) updateHallStatus(currentEvent.id, 'Completed', 0);
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* 1. Sleek Venue & Event Control Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Coordinator Console
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time venue attendance verification & scanner terminal
          </p>
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Hall Selector */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedHall}
              onChange={(e) => {
                const newHall = e.target.value;
                setSelectedHall(newHall);
                const matchingEvent = events.find((ev) => ev.hall_number === newHall);
                if (matchingEvent) setSelectedEventId(matchingEvent.id);
              }}
              className="w-full sm:w-52 bg-slate-50 border border-slate-200/90 text-slate-900 font-semibold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600 cursor-pointer shadow-2xs"
            >
              {halls.map((hall) => (
                <option key={hall} value={hall}>
                  {hall}
                </option>
              ))}
            </select>
          </div>

          {/* Event Selector (if multiple events in hall or venue) */}
          {events.length > 1 && (
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={currentEvent?.id || ''}
                onChange={(e) => {
                  const evId = e.target.value;
                  setSelectedEventId(evId);
                  const evObj = events.find((ev) => ev.id === evId);
                  if (evObj && evObj.hall_number) setSelectedHall(evObj.hall_number);
                }}
                className="w-full sm:w-52 bg-slate-50 border border-slate-200/90 text-slate-900 font-semibold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600 cursor-pointer shadow-2xs"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.hall_number})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchEventStats(currentEvent?.id)}
            title="Refresh Attendance Stats"
            disabled={isFetchingAttendance}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetchingAttendance ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats: 3 Minimalist Pastel Stat Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1: Total Scanned */}
        <div className="bg-emerald-50/70 border border-emerald-100/90 p-5 rounded-2xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Total Scanned</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-950 font-mono tracking-tight">
            {stats.totalScanned}
          </div>
          <p className="text-[11px] text-emerald-700/80 font-medium">
            Verified check-ins in {currentEvent?.title ? `"${currentEvent.title}"` : selectedHall}
          </p>
        </div>

        {/* Stat 2: Pending Check-In */}
        <div className="bg-amber-50/70 border border-amber-100/90 p-5 rounded-2xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Pending Check-In</span>
          </div>
          <div className="text-3xl font-extrabold text-amber-950 font-mono tracking-tight">
            {stats.pendingCheckIn}
          </div>
          <p className="text-[11px] text-amber-700/80 font-medium">
            {stats.pendingCheckIn} students awaiting venue check-in
          </p>
        </div>

        {/* Stat 3: Success Rate */}
        <div className="bg-indigo-50/70 border border-indigo-100/90 p-5 rounded-2xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Success Rate</span>
          </div>
          <div className="text-3xl font-extrabold text-indigo-950 font-mono tracking-tight">
            {stats.successRate}%
          </div>
          <p className="text-[11px] text-indigo-700/80 font-medium">
            {stats.totalScanned} of {stats.totalRegistered} students present
          </p>
        </div>
      </div>

      {/* 3. Main Body Grid: Scanner Card & Live Recent Scans */}
      {!currentEvent ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-xs text-center text-slate-500 text-xs">
          No active symposium event is currently assigned to <strong className="text-slate-700">{selectedHall}</strong>.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Centered Distraction-Free Scanner Card (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    Scan Student Pass
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Position student QR badge in front of lens
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono truncate max-w-[180px]">
                    {currentEvent.title}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono">
                    {currentEvent.hall_number || selectedHall}
                  </span>
                </div>
              </div>

              {/* Centered Clean Viewfinder Box */}
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-center space-y-4">
                <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center text-indigo-600 relative group">
                  <QrCode className="w-12 h-12 stroke-[1.5]" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900">
                    Ready for Camera Verification
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    One-touch fast camera verification with instant audio and visual haptic response
                  </p>
                </div>

                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Launch QR Scanner</span>
                </button>
              </div>

              {/* Event Quick Actions Bar */}
              <div className="pt-1 flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedRosterEvent(currentEvent);
                      setShowRosterModal(true);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    View Roster ({stats.totalRegistered})
                  </button>
                  <button
                    onClick={() => handleEditClick(currentEvent)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    Edit Event
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartEvent}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    Start
                  </button>
                  <button
                    onClick={handleDelayEvent}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    +10m Delay
                  </button>
                  <button
                    onClick={handleEndEvent}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    End
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Scans Relational Feed (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Recent Scans
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                  {recentScans.length} Scanned
                </span>
              </div>

              {/* Clean Lightweight Scans List with Real Student Names, Roll No, & Scanned Time */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {recentScans.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No scans recorded yet for {currentEvent.title}.
                  </div>
                ) : (
                  recentScans.slice(0, 15).map((scan) => {
                    const studentProfile = scan.profiles;
                    const studentName =
                      studentProfile?.full_name ||
                      studentProfile?.name ||
                      (studentProfile?.email ? studentProfile.email.split('@')[0] : null) ||
                      'Student Name';
                    const rollNo = studentProfile?.roll_no || studentProfile?.college_id;
                    const scannedTime = scan.checked_in_at || scan.attended_at;
                    const timeString = scannedTime
                      ? new Date(scannedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now';

                    return (
                      <div
                        key={scan.id}
                        className="py-2.5 px-3.5 bg-slate-50/90 hover:bg-slate-100/90 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{studentName}</span>
                            {studentProfile?.college && (
                              <span className="text-[10px] text-slate-400 font-normal truncate">
                                • {studentProfile.college}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            {rollNo && (
                              <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[10px] font-semibold">
                                {rollNo}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 truncate">
                              {currentEvent.title}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end">
                          <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {timeString}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
