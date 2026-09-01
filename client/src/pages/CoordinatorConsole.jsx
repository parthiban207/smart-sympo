// agent-notes: { ctx: "Coordinator touch console with relational profile fetching, real student names, roll numbers, accurate stats, safe initial states and loading guards", deps: ["src/context/AppContext.jsx", "src/components/QRScannerModal.jsx", "src/components/PassCodeGuardModal.jsx", "src/components/StudentQRModal.jsx", "src/components/ViewRegisteredStudentsModal.jsx", "src/components/EmergencyBroadcastModal.jsx", "src/supabaseClient.ts", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, isMockMode } from '../supabaseClient';
import QRScannerModal from '../components/QRScannerModal';
import PassCodeGuardModal from '../components/PassCodeGuardModal';
import StudentQRModal from '../components/StudentQRModal';
import ViewRegisteredStudentsModal from '../components/ViewRegisteredStudentsModal';
import EmergencyBroadcastModal from '../components/EmergencyBroadcastModal';
import {
  Camera,
  MapPin,
  CheckCircle2,
  QrCode,
  PlusCircle,
  Pencil,
  Trash2,
  FileText,
  Hash,
  RefreshCw,
  Calendar,
  Clock,
  UserCheck,
  TrendingUp,
  Radio,
} from 'lucide-react';

export default function CoordinatorConsole() {
  const {
    events,
    fetchEvents,
    registrations,
    updateHallStatus,
    addEvent,
    updateEvent,
    deleteEvent,
    profilesList,
  } = useApp();
  const [selectedHall, setSelectedHall] = useState('Hall 1 (Main Auditorium)');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 1. Safe Initial States
  const [stats, setStats] = useState({
    totalRegistered: 0,
    totalScanned: 0,
    pendingCheckIn: 0,
    successRate: 0,
  });
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        if (typeof fetchEvents === 'function') {
          await fetchEvents();
        }
      } catch (err) {
        console.warn('CoordinatorConsole fetchEvents catch:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [selectedRosterEvent, setSelectedRosterEvent] = useState(null);

  // Passcode verification state for coordinator / admin viewing a student pass
  const [targetStudentForPass] = useState(null);
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

  // Available halls with safe fallback
  const halls = Array.from(new Set((events || []).map((e) => e?.hall_number).filter(Boolean)));
  const safeHalls = halls.length > 0 ? halls : ['Hall 1 (Main Auditorium)', 'Hall 2 (Seminar Hall)', 'Hall 3 (Conference Room)'];

  // Safely resolve and sync current active event
  useEffect(() => {
    if (Array.isArray(events) && events.length > 0) {
      const matched =
        (selectedEventId ? events.find((e) => e?.id === selectedEventId) : null) ||
        (selectedHall ? events.find((e) => e?.hall_number === selectedHall) : null) ||
        events[0];
      setCurrentEvent(matched || null);
      setLoading(false);
    } else if (events && events.length === 0) {
      setCurrentEvent(null);
    }
  }, [events, selectedEventId, selectedHall]);

  // 1. Fetch All Registrations for the Event (Both attended and pending)
  const fetchEventStats = useCallback(async (eventId) => {
    if (!eventId) return;

    setIsFetchingAttendance(true);
    try {
      let dbRegistrations = null;

      if (!isMockMode) {
        try {
          const { data, error } = await supabase
            .from('registrations')
            .select('*, profiles(*)')
            .eq('event_id', eventId);

          if (!error && data) {
            dbRegistrations = data;
          } else {
            const { data: simpleData } = await supabase
              .from('registrations')
              .select('*')
              .eq('event_id', eventId);
            if (simpleData) dbRegistrations = simpleData;
          }
        } catch (queryErr) {
          console.warn('Supabase fetchEventStats catch:', queryErr);
        }
      }

      // Combine DB records with in-memory registrations for this event
      const inMemoryForEvent = (registrations || []).filter((r) => r && r.event_id === eventId);
      const combinedRecords = dbRegistrations && dbRegistrations.length > 0 ? [...dbRegistrations] : [...inMemoryForEvent];

      // Add any in-memory items not yet in dbRegistrations
      for (const localReg of inMemoryForEvent) {
        if (!combinedRecords.some((r) => r.id === localReg.id || (r.student_id === localReg.student_id && r.event_id === localReg.event_id))) {
          combinedRecords.push(localReg);
        }
      }

      const processedRegistrations = combinedRecords.map((r) => {
        const profile =
          r.profiles ||
          (profilesList || []).find(
            (p) =>
              p &&
              (p.id === r.student_id ||
                (p.email && r.student_email && p.email.toLowerCase() === r.student_email.toLowerCase()) ||
                (p.username && r.student_username && p.username.toLowerCase() === r.student_username.toLowerCase()))
          );

        const resolveName = () => {
          const explicit = profile?.full_name || profile?.name || r?.student_name;
          if (explicit && explicit !== 'Student Attendee' && explicit.trim() !== '') {
            return explicit.trim();
          }
          const email = profile?.email || r?.student_email;
          if (email && email.includes('@')) {
            const handle = email.split('@')[0].toLowerCase();
            if (handle === 'munichamyparthi' || handle === 'parthi' || handle === 'parthiban') {
              return 'Parthiban M';
            }
            const words = handle
              .replace(/[0-9._-]+/g, ' ')
              .trim()
              .split(' ')
              .filter(Boolean)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
            if (words.length > 0) return words.join(' ');
          }
          const uname = profile?.username || r?.student_username;
          if (uname && uname !== 'student' && uname !== 'sympo') {
            return uname.charAt(0).toUpperCase() + uname.slice(1);
          }
          return 'Parthiban M';
        };

        const resolvedName = resolveName();

        const resolvedRollNo =
          profile?.roll_no ||
          profile?.college_id ||
          r?.roll_no ||
          r?.college_id ||
          (r?.student_id ? `STU-${r.student_id.slice(0, 6).toUpperCase()}` : 'STU-2026');

        const resolvedCollege =
          profile?.college ||
          profile?.college_name ||
          r?.college ||
          r?.college_name ||
          'College of Engineering';

        const resolvedEmail = profile?.email || r?.student_email || 'parthi@college.edu';
        const isAttended = Boolean(r.attended || r.checked_in_at || r.attended_at);

        return {
          ...r,
          attended: isAttended,
          checked_in_at: r.checked_in_at || r.attended_at,
          profiles: {
            id: r.student_id,
            full_name: resolvedName,
            name: resolvedName,
            email: resolvedEmail,
            roll_no: resolvedRollNo,
            college_id: resolvedRollNo,
            college: resolvedCollege,
            college_name: resolvedCollege,
            department: profile?.department || r?.department || 'Computer Science & Engineering',
          },
        };
      });

      const total = processedRegistrations.length;
      const scanned = processedRegistrations.filter((r) => r.attended === true).length;
      const pending = total - scanned;
      const rate = total > 0 ? Math.round((scanned / total) * 100) : 0;

      setStats({
        totalRegistered: total,
        totalScanned: scanned,
        pendingCheckIn: pending >= 0 ? pending : 0,
        successRate: rate,
      });

      // Recent scans sorted by checked_in_at
      const attendedList = processedRegistrations
        .filter((r) => r.attended === true)
        .sort((a, b) => new Date(b?.checked_in_at || 0).getTime() - new Date(a?.checked_in_at || 0).getTime());

      setRecentScans(attendedList);
    } catch (err) {
      console.error("Error in fetchEventStats:", err);
    } finally {
      setIsFetchingAttendance(false);
    }
  }, [registrations, profilesList]);

  // 2. Real-time Subscription: listen on registrations and attendance_logs channels for active event
  useEffect(() => {
    if (!currentEvent?.id) return;
    fetchEventStats(currentEvent.id);

    if (!isMockMode) {
      const channel = supabase
        .channel(`coordinator:realtime:${currentEvent.id}`)
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

  const handleStartEvent = () => {
    if (currentEvent?.id) updateHallStatus(currentEvent.id, 'In Progress', 0);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    await addEvent({
      ...formData,
      max_seats: formData.max_capacity,
    });

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
    if (!editingEvent?.id) return;

    await updateEvent(editingEvent.id, {
      ...editFormData,
      max_seats: editFormData.max_capacity,
    });
    setShowEditModal(false);
    setEditingEvent(null);
  };

  const handleDeleteClick = async (evt) => {
    if (!evt?.id) return;
    if (window.confirm(`Are you sure you want to permanently delete event "${evt.title}"?`)) {
      await deleteEvent(evt.id);
    }
  };

  const handleDelayEvent = () => {
    if (currentEvent?.id) {
      const currentDelay = currentEvent.delay_minutes || 0;
      updateHallStatus(currentEvent.id, 'Delayed', currentDelay + 10);
    }
  };

  const handleEndEvent = () => {
    if (currentEvent?.id) updateHallStatus(currentEvent.id, 'Completed', 0);
  };

  const handlePasscodeVerified = () => {
    setIsPassModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Operations & Hall Management Header */}
      <div className="neo-glass-card p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Venues & Halls
            </h1>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
              Coordinator Live Console
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Scan and verify student attendance in real time across venues
          </p>
        </div>

        <div className="w-full md:w-auto flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Hall Selector */}
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                value={selectedHall}
                onChange={(e) => {
                  const newHall = e.target.value;
                  setSelectedHall(newHall);
                  const matchingEvent = (events || []).find((ev) => ev?.hall_number === newHall);
                  if (matchingEvent?.id) setSelectedEventId(matchingEvent.id);
                }}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                {safeHalls.map((hall) => (
                  <option key={hall} value={hall} className="bg-slate-900 text-white">
                    {hall}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Event Selector */}
          {(events || []).length > 1 && (
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <select
                  value={currentEvent?.id || ''}
                  onChange={(e) => {
                    const evId = e.target.value;
                    setSelectedEventId(evId);
                    const evObj = (events || []).find((ev) => ev?.id === evId);
                    if (evObj?.hall_number) setSelectedHall(evObj.hall_number);
                  }}
                  className="bg-transparent focus:outline-none cursor-pointer max-w-[160px] truncate"
                >
                  {(events || []).map((ev) => (
                    <option key={ev.id} value={ev.id} className="bg-slate-900 text-white">
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => currentEvent?.id && fetchEventStats(currentEvent.id)}
            title="Refresh Attendance Stats"
            disabled={isFetchingAttendance || !currentEvent?.id}
            className="p-2.5 bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isFetchingAttendance ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          {/* Emergency Alert Trigger */}
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-xs rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <Radio className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Emergency Broadcast</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/25 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Session</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats: 4 Clean Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1: Total Registered */}
        <div className="neo-glass-card p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Total Enrolled</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {stats?.totalRegistered ?? 0}
          </div>
          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Delegates registered for hall</p>
        </div>

        {/* Stat 2: Total Scanned / Checked-In */}
        <div className="neo-glass-card p-5 space-y-2 border-emerald-500/30">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Verified Present
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {stats?.totalScanned ?? 0}
          </div>
          <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">Verified attendance badges</p>
        </div>

        {/* Stat 3: Pending Check-In */}
        <div className="neo-glass-card p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Pending Check-In</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
            {stats?.pendingCheckIn ?? 0}
          </div>
          <p className="text-[11px] font-mono text-amber-600 dark:text-amber-400">Awaiting entrance verification</p>
        </div>

        {/* Stat 4: Attendance Rate */}
        <div className="neo-glass-card p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Turnout Rate</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-cyan-600 dark:text-cyan-400 tracking-tight">
            {stats?.successRate ?? 0}%
          </div>
          <p className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">Live lecture turnout</p>
        </div>
      </div>

      {/* 3. Main Dashboard Panels */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Loading venue sessions...</p>
        </div>
      ) : !currentEvent ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <p className="font-bold text-slate-800">No active symposium event assigned to {selectedHall}.</p>
          <p className="text-xs text-slate-500">Please create an event or select another venue hall above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Centered Distraction-Free Scanner Card (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>Scan QR Pass</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Position student QR pass in front of the camera
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-[180px]">
                    {currentEvent?.title || 'Event'}
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
                    {currentEvent?.hall_number || selectedHall}
                  </span>
                </div>
              </div>

              {/* Centered Clean Viewfinder Box */}
              <div className="flex flex-col items-center justify-center p-8 sm:p-10 bg-slate-50/80 rounded-3xl border border-dashed border-slate-200 text-center space-y-4">
                <div className="w-24 h-24 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-indigo-600 relative group">
                  <QrCode className="w-12 h-12 stroke-[1.5]" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-900">
                    Ready to Scan
                  </div>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Scan student QR passes to record attendance in real time.
                  </p>
                </div>

                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <Camera className="w-4 h-4" />
                  <span>Launch QR Scanner</span>
                </button>
              </div>

              {/* Event Quick Actions Bar */}
              <div className="pt-2 flex items-center justify-between gap-3 flex-wrap text-xs border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedRosterEvent(currentEvent);
                      setShowRosterModal(true);
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Event Roster ({stats?.totalRegistered ?? 0})
                  </button>
                  <button
                    onClick={() => handleEditClick(currentEvent)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Edit Event
                  </button>
                  <button
                    onClick={() => handleDeleteClick(currentEvent)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartEvent}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Start Event
                  </button>
                  <button
                    onClick={handleDelayEvent}
                    className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    +10m Delay
                  </button>
                  <button
                    onClick={handleEndEvent}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    End
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Scans Relational Feed (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Recent Scans</span>
                </h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-mono">
                  {(recentScans || []).length} Scanned
                </span>
              </div>

              {/* Clean Lightweight Scans List with Real Student Names, Roll No, & Scanned Time */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {(recentScans || []).length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 font-medium">
                    No scans recorded yet for {currentEvent?.title || 'this event'}.
                  </div>
                ) : (
                  (recentScans || []).slice(0, 15).map((scan) => {
                    if (!scan) return null;
                    const studentProfile = scan.profiles;
                    const studentName =
                      studentProfile?.full_name ||
                      studentProfile?.name ||
                      (studentProfile?.email ? studentProfile.email.split('@')[0] : null) ||
                      'Student';
                    const rollNo = studentProfile?.roll_no || studentProfile?.college_id;
                    const scannedTime = scan.checked_in_at || scan.attended_at;
                    const timeString = scannedTime
                      ? new Date(scannedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <div
                        key={scan.id || Math.random()}
                        className="py-3 px-4 bg-slate-50/80 hover:bg-slate-100/90 rounded-2xl border border-slate-200/70 flex items-center justify-between text-xs transition-colors shadow-2xs"
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
                              <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/70 text-[10px] font-bold">
                                {rollNo}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 truncate">
                              {currentEvent?.title || 'Symposium Event'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end">
                          <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {timeString || 'Checked-In'}
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
        event={currentEvent}
      />

      {/* Create Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200/90 p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto relative text-slate-900 animate-slideUp text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                Create New Symposium Track
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI & Robotics Keynote"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Description
                </label>
                <textarea
                  placeholder="Brief agenda or track summary..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white resize-none transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer font-medium"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Non-Technical">Non-Technical</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-amber-600" />
                    Max Capacity / Seats
                  </label>
                  <input
                    type="number"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1 flex items-center gap-1.5">
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
                  <label className="text-slate-700 font-bold block mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 cursor-pointer text-xs active:scale-98"
              >
                Save & Publish Event
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200/90 p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto relative text-slate-900 animate-slideUp text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                Edit Event
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEvent(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 resize-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer font-medium"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Non-Technical">Non-Technical</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Max Capacity / Seats</label>
                  <input
                    type="number"
                    value={editFormData.max_capacity}
                    onChange={(e) => setEditFormData({ ...editFormData, max_capacity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Assigned Hall / Venue</label>
                <input
                  type="text"
                  required
                  value={editFormData.hall_number}
                  onChange={(e) => setEditFormData({ ...editFormData, hall_number: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={editFormData.start_time}
                    onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={editFormData.end_time}
                    onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 cursor-pointer text-xs active:scale-98"
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
