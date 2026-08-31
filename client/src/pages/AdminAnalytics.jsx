// agent-notes: { ctx: "Admin analytics dashboard with realtime registrations subscription, Excel spreadsheet export system, and role management", deps: ["src/context/AppContext.jsx", "src/hooks/usePresence.ts", "src/components/QRScannerModal.jsx", "src/utils/exportReports.ts", "src/supabaseClient.js", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { usePresence } from '../hooks/usePresence';
import { supabase, isMockMode } from '../supabaseClient';
import {
  exportAttendanceCSV,
  exportEventRegistrationsCSV,
  exportCoordinatorsCSV,
  exportSingleEventRegistrationsCSV,
  exportStudentsCSV,
  exportAllUsersCSV,
  exportEmailDispatchCSV,
  exportMultiSheetUsersWorkbook,
  exportStudentsExcel,
  exportCoordinatorsExcel,
  exportEventRegistrationsExcel,
  exportAttendanceRecordsExcel,
  exportEmailDispatchExcel,
  exportToPDF,
} from '../utils/exportReports';
import QRScannerModal from '../components/QRScannerModal';
import ViewRegisteredStudentsModal from '../components/ViewRegisteredStudentsModal';
import EmergencyBroadcastModal from '../components/EmergencyBroadcastModal';
import {
  ShieldCheck, PlusCircle, MapPin, Radio, UserCheck, Users,
  Globe, Crosshair, Ruler, FileText, ScanLine, Clock, Hash, CheckCircle2, AlertCircle,
  Pencil, Trash2, KeyRound, Lock, FileSpreadsheet, Download, FileDown,
  StopCircle, Mail, Search, Building, Eye, MoreHorizontal
} from 'lucide-react';

export default function AdminAnalytics() {
  const {
    events, fetchEvents, registrations, setRegistrations, attendanceLogs, setAttendanceLogs,
    addEvent, updateEvent, deleteEvent, unregisterForEvent, currentUser, profilesList, setProfilesList,
    updateUserRole, createCoordinatorAccount, deleteUserAccount, clearAllAccounts, liveAlerts,
    clearGlobalEmergencyBroadcast
  } = useApp();
  const { onlineUsers, onlineCount } = usePresence();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddCoordinatorModal, setShowAddCoordinatorModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [adminTab, setAdminTab] = useState('attendance'); // 'attendance' | 'events' | 'users' | 'reports'
  const [selectedExportEventId, setSelectedExportEventId] = useState('');
  const [coordForm, setCoordForm] = useState({ fullName: '', email: '', password: '', phone: '', department: '' });
  const [creatingCoord, setCreatingCoord] = useState(false);
  const [showMoreActionsMenu, setShowMoreActionsMenu] = useState(false);

  // Real-Time Attendance Re-fetch Helper (with relational query)
  const fetchAttendanceList = useCallback(async () => {
    if (isMockMode) return;
    try {
      let { data: regData, error: regError } = await supabase
        .from('registrations')
        .select(`
          *,
          events (title, venue, type, hall_number, category),
          profiles:student_id (id, full_name, name, email, roll_no, college, department, phone, college_id)
        `)
        .order('registered_at', { ascending: false });

      if (regError) {
        const { data: fallbackReg } = await supabase
          .from('registrations')
          .select('*')
          .order('registered_at', { ascending: false });
        regData = fallbackReg;
      }

      if (regData && setRegistrations) {
        setRegistrations(regData);
      }

      const { data: attData } = await supabase
        .from('attendance_logs')
        .select('*')
        .order('check_in_time', { ascending: false });
      if (attData && setAttendanceLogs) {
        setAttendanceLogs(attData);
      }

      const { data: profData } = await supabase.from('profiles').select('*');
      if (profData && setProfilesList) {
        setProfilesList(profData);
      }
    } catch (err) {
      console.warn('[Admin Dashboard Realtime Attendance Fetch Error]:', err);
    }
  }, [setRegistrations, setAttendanceLogs, setProfilesList]);

  // Initial Data Fetch & Live Supabase Realtime Subscription on registrations
  useEffect(() => {
    fetchEvents();
    fetchAttendanceList();

    if (!isMockMode) {
      const channel = supabase
        .channel('realtime:registrations')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'registrations' },
          () => {
            fetchAttendanceList();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendance_logs' },
          () => {
            fetchAttendanceList();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchEvents, fetchAttendanceList]);

  const [showRosterModal, setShowRosterModal] = useState(false);
  const [selectedRosterEvent, setSelectedRosterEvent] = useState(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(null);

  // Real-Time Attendance Search & Filter State
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('ALL'); // 'ALL' | 'ATTENDED' | 'PENDING'

  // Spreadsheet Export Feedback State
  const [exportFeedback, setExportFeedback] = useState(null);

  // Master Security Passcode Confirmation Modal State
  const [securityModalState, setSecurityModalState] = useState({
    isOpen: false,
    actionType: 'single', // 'single' | 'bulk'
    targetUserId: null,
    targetUserName: '',
  });
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [securityModalError, setSecurityModalError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
    hall_number: 'Hall 1 (Main Auditorium)',
    latitude: '',
    longitude: '',
    allowed_radius: 200,
    start_time: '',
    end_time: '',
    max_capacity: 100,
  });

  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
    hall_number: '',
    latitude: '',
    longitude: '',
    allowed_radius: 200,
    start_time: '',
    end_time: '',
    max_capacity: 100,
  });

  const adminCount = (profilesList || []).filter((p) => p.role === 'admin').length;
  const coordinatorCount = (profilesList || []).filter((p) => p.role === 'coordinator').length;
  const studentCount = (profilesList || []).filter((p) => p.role === 'student').length;

  const totalRegistrationsCount = (registrations || []).length;
  const totalAttendedCount = (registrations || []).filter(
    (r) => r.attended || (attendanceLogs || []).some((log) => log.student_id === r.student_id && log.event_id === r.event_id)
  ).length;
  const pendingAttendanceCount = Math.max(0, totalRegistrationsCount - totalAttendedCount);
  const liveAttendanceRate = totalRegistrationsCount > 0
    ? Math.round((totalAttendedCount / totalRegistrationsCount) * 100)
    : 0;

  // Combined Real-Time Joined Attendance Table
  const joinedAttendanceRecords = (registrations || []).map((reg) => {
    const matchedProfile =
      reg.profiles ||
      (profilesList || []).find(
        (p) =>
          p.id === reg.student_id ||
          (p.email && reg.student_email && p.email.toLowerCase() === reg.student_email.toLowerCase()) ||
          (p.username && reg.student_username && p.username.toLowerCase() === reg.student_username.toLowerCase())
      );
    const matchedEvent = reg.events || (events || []).find((e) => e.id === reg.event_id);
    const matchedLog = (attendanceLogs || []).find(
      (log) =>
        (log.student_id && log.student_id === reg.student_id && log.event_id === reg.event_id) ||
        (log.student_id && log.student_id === reg.student_id)
    );
    const coordinatorProfile = reg.scanned_by
      ? (profilesList || []).find((p) => p.id === reg.scanned_by || p.email === reg.scanned_by || p.full_name === reg.scanned_by)
      : null;

    const isAttended = Boolean(reg.attended || reg.checked_in_at || reg.attended_at || matchedLog);
    const checkInTime = reg.checked_in_at || reg.attended_at || matchedLog?.check_in_time || null;

    const studentName =
      matchedProfile?.full_name ||
      matchedProfile?.name ||
      reg.student_name ||
      (matchedProfile?.email ? matchedProfile.email.split('@')[0] : null) ||
      (reg.student_email ? reg.student_email.split('@')[0] : null) ||
      'Student Attendee';

    const rollNo =
      matchedProfile?.roll_no ||
      matchedProfile?.college_id ||
      reg.roll_no ||
      reg.college_id ||
      (reg.student_id ? `STU-${reg.student_id.slice(0, 6).toUpperCase()}` : 'N/A');

    const collegeName =
      matchedProfile?.college ||
      matchedProfile?.college_name ||
      reg.college ||
      reg.college_name ||
      'Main Campus';

    const email = matchedProfile?.email || reg.student_email || 'N/A';

    return {
      id: reg.id || `${reg.student_id}-${reg.event_id}`,
      registration_id: reg.id,
      student_id: reg.student_id,
      student_name: studentName,
      roll_no: rollNo,
      college_name: collegeName,
      department: matchedProfile?.department || reg.department || 'General',
      phone: matchedProfile?.phone || matchedProfile?.phone_number || 'N/A',
      email: email,
      event_id: reg.event_id,
      event_title: matchedEvent?.title || reg.event_title || 'Symposium Session',
      hall_number: matchedEvent?.venue || matchedEvent?.hall_number || matchedLog?.hall_number || 'Main Venue',
      category: matchedEvent?.type || matchedEvent?.category || reg.category || 'Technical',
      is_attended: isAttended,
      checked_in_at: checkInTime,
      attended_at: checkInTime,
      registered_at: reg.registered_at,
      scanned_by_name: reg.scanned_by || coordinatorProfile?.full_name || coordinatorProfile?.name || null,
    };
  });

  const filteredAttendanceRecords = joinedAttendanceRecords.filter((record) => {
    const query = attendanceSearchQuery.toLowerCase();
    const matchesQuery =
      record.student_name.toLowerCase().includes(query) ||
      record.roll_no.toLowerCase().includes(query) ||
      record.college_name.toLowerCase().includes(query) ||
      record.event_title.toLowerCase().includes(query) ||
      record.email.toLowerCase().includes(query);

    if (!matchesQuery) return false;
    if (attendanceStatusFilter === 'ATTENDED') return record.is_attended;
    if (attendanceStatusFilter === 'PENDING') return !record.is_attended;
    return true;
  });

  const handleRoleChange = async (targetUserId, newRole) => {
    setUpdatingUser(targetUserId);
    const res = await updateUserRole(targetUserId, newRole);
    if (res.success) {
      setExportFeedback({ type: 'success', message: res.message });
      setTimeout(() => setExportFeedback(null), 3000);
    } else {
      setExportFeedback({ type: 'error', message: res.message });
      setTimeout(() => setExportFeedback(null), 4000);
    }
    setUpdatingUser(null);
  };

  const handleCreateCoordinator = async (e) => {
    e.preventDefault();
    if (!coordForm.fullName.trim() || !coordForm.email.trim() || !coordForm.password.trim()) {
      setExportFeedback({ type: 'error', message: 'Please fill in Coordinator Full Name, Email, and Password.' });
      setTimeout(() => setExportFeedback(null), 4000);
      return;
    }
    setCreatingCoord(true);
    const res = await createCoordinatorAccount(coordForm);
    if (res.success) {
      setExportFeedback({ type: 'success', message: res.message });
      setShowAddCoordinatorModal(false);
      setCoordForm({ fullName: '', email: '', password: '', phone: '', department: '' });
      setTimeout(() => setExportFeedback(null), 4000);
    } else {
      setExportFeedback({ type: 'error', message: res.message });
      setTimeout(() => setExportFeedback(null), 4000);
    }
    setCreatingCoord(false);
  };

  const handleEditClick = (evt) => {
    setEditingEvent(evt);
    setEditFormData({
      title: evt.title || '',
      description: evt.description || '',
      category: evt.category || 'Technical',
      hall_number: evt.hall_number || '',
      latitude: evt.latitude || '',
      longitude: evt.longitude || '',
      allowed_radius: evt.allowed_radius || 200,
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

  // Single User Deletion - Trigger Master Security Code Confirmation ("2027")
  const handleDeleteAccount = async (userId, userName) => {
    const formattedName = userName || 'User';
    setSecurityModalError(null);
    setEnteredPasscode('');

    const promptText = `Enter Master Security Code to delete this user [${formattedName}]:`;
    const inputCode = typeof window !== 'undefined' && typeof window.prompt === 'function'
      ? window.prompt(promptText)
      : undefined;

    if (inputCode !== undefined) {
      if (inputCode === null) {
        return;
      }
      const trimmedCode = String(inputCode).trim();
      if (trimmedCode !== '2027') {
        const errorText = 'Access Denied: Incorrect Security Code!';
        setExportFeedback({ message: errorText, type: 'error' });
        setTimeout(() => setExportFeedback(null), 4000);
        return;
      }

      const res = await deleteUserAccount(userId, trimmedCode);
      if (res.success) {
        setExportFeedback({ message: `Account "${formattedName}" deleted successfully!`, type: 'success' });
        setTimeout(() => setExportFeedback(null), 3000);
      } else {
        const errorText = res.message || 'Access Denied: Incorrect Security Code!';
        setExportFeedback({ message: errorText, type: 'error' });
        setTimeout(() => setExportFeedback(null), 4000);
      }
      return;
    }

    setSecurityModalState({
      isOpen: true,
      actionType: 'single',
      targetUserId: userId,
      targetUserName: formattedName,
    });
  };

  // Process Master Passcode Verification (Strictly "2027")
  const handleConfirmSecurityAction = async (e) => {
    if (e) e.preventDefault();
    setSecurityModalError(null);

    const trimmedCode = String(enteredPasscode).trim();

    if (securityModalState.actionType === 'single') {
      if (trimmedCode !== '2027') {
        const errorText = 'Access Denied: Incorrect Security Code!';
        setSecurityModalError(errorText);
        setExportFeedback({ message: errorText, type: 'error' });
        setTimeout(() => setExportFeedback(null), 4000);
        return;
      }

      const res = await deleteUserAccount(securityModalState.targetUserId, trimmedCode);
      if (res.success) {
        setSecurityModalState({ isOpen: false, actionType: 'single', targetUserId: null, targetUserName: '' });
        setExportFeedback({ message: `Account "${securityModalState.targetUserName}" deleted successfully!`, type: 'success' });
        setTimeout(() => setExportFeedback(null), 3000);
      } else {
        const errorText = res.message || 'Access Denied: Incorrect Security Code!';
        setSecurityModalError(errorText);
      }
    } else if (securityModalState.actionType === 'bulk') {
      if (trimmedCode !== '2027') {
        const errorText = 'Operation Aborted: Invalid Security Code';
        setSecurityModalError(errorText);
        setExportFeedback({ message: errorText, type: 'error' });
        setTimeout(() => setExportFeedback(null), 4000);
        return;
      }

      const res = await clearAllAccounts(trimmedCode);
      if (res.success) {
        setSecurityModalState({ isOpen: false, actionType: 'bulk', targetUserId: null, targetUserName: '' });
        setExportFeedback({ message: 'All accounts deleted successfully!', type: 'success' });
        setTimeout(() => setExportFeedback(null), 3000);
      } else {
        const errorText = res.message || 'Operation Aborted: Invalid Security Code';
        setSecurityModalError(errorText);
      }
    }
  };

  // Helper to fetch latest users from Supabase + Local
  const getCombinedUsersForExport = async () => {
    let usersToExport = profilesList || [];
    if (!isMockMode) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          const combined = [...data];
          for (const p of usersToExport) {
            if (
              !combined.some(
                (u) =>
                  u.id === p.id ||
                  (u.email && p.email && u.email.toLowerCase() === p.email.toLowerCase())
              )
            ) {
              combined.push(p);
            }
          }
          usersToExport = combined;
        }
      } catch (e) {
        console.warn('Supabase fetch profiles for export warning:', e);
      }
    }
    return usersToExport;
  };

  // 1. Export All Registered Users by Role (Multi-Sheet Workbook)
  const handleExportMultiSheetUsers = async () => {
    try {
      setExportFeedback(null);
      const users = await getCombinedUsersForExport();
      exportMultiSheetUsersWorkbook(users);
      setExportFeedback({
        type: 'success',
        message: `All_Users_Directory_By_Role.xlsx downloaded with 3 separate sheets (Students, Coordinators, Admins)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting multi-sheet workbook:', err);
      setExportFeedback({ type: 'error', message: 'Failed to generate multi-sheet workbook.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  // 1b. Export Students (CSV & Excel)
  const handleExportStudentsCSV = async () => {
    try {
      setExportFeedback(null);
      const users = await getCombinedUsersForExport();
      const count = users.filter((u) => (u.role || 'student').toLowerCase() === 'student').length;
      exportStudentsCSV(users);
      setExportFeedback({
        type: 'success',
        message: `SmartSympo_Registered_Students.csv downloaded (${count} students)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting students CSV:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export students CSV.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  const handleExportStudentsExcel = async () => {
    try {
      setExportFeedback(null);
      const users = await getCombinedUsersForExport();
      const count = users.filter((u) => (u.role || 'student').toLowerCase() === 'student').length;
      exportStudentsExcel(users);
      setExportFeedback({
        type: 'success',
        message: `Registered_Students_Report.xlsx exported successfully (${count} students)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting students report:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export students spreadsheet.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  // 1c. Export Coordinators (CSV & Excel)
  const handleExportCoordinatorsCSV = async () => {
    try {
      setExportFeedback(null);
      const users = await getCombinedUsersForExport();
      const count = users.filter((u) => (u.role || '').toLowerCase() === 'coordinator').length;
      exportCoordinatorsCSV(users, onlineUsers);
      setExportFeedback({
        type: 'success',
        message: `SmartSympo_Coordinators_Login_Report.csv downloaded (${count} coordinators)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting coordinators CSV:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export coordinators CSV.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  const handleExportCoordinatorsExcel = async () => {
    try {
      setExportFeedback(null);
      const users = await getCombinedUsersForExport();
      const count = users.filter((u) => (u.role || '').toLowerCase() === 'coordinator').length;
      exportCoordinatorsExcel(users);
      setExportFeedback({
        type: 'success',
        message: `Coordinators_Directory_Report.xlsx exported successfully (${count} coordinators)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting coordinators report:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export coordinators spreadsheet.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  // 1d. Export All Users CSV
  const handleExportAllUsersCSV = async () => {
    try {
      setExportFeedback(null);
      const users = await getCombinedUsersForExport();
      exportAllUsersCSV(users, onlineUsers);
      setExportFeedback({
        type: 'success',
        message: `SmartSympo_All_Users_Directory.csv downloaded (${users.length} accounts)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting all users CSV:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export all users CSV.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  // 2. Export All Student Event Registrations (CSV & Excel)
  const handleExportAllRegistrationsCSV = async () => {
    try {
      setExportFeedback(null);
      let regsToExport = registrations || [];
      let eventsList = events || [];
      let profsList = profilesList || [];

      if (!isMockMode) {
        try {
          const [regRes, evtRes, profRes] = await Promise.all([
            supabase.from('registrations').select('*').order('registered_at', { ascending: false }),
            supabase.from('events').select('*'),
            supabase.from('profiles').select('*'),
          ]);
          if (regRes.data) regsToExport = regRes.data;
          if (evtRes.data) eventsList = evtRes.data;
          if (profRes.data) profsList = profRes.data;
        } catch (e) {
          console.warn('Supabase fetch registrations for export warning:', e);
        }
      }

      exportEventRegistrationsCSV(regsToExport, eventsList, profsList);
      setExportFeedback({
        type: 'success',
        message: `SmartSympo_All_Student_Registrations.csv downloaded (${regsToExport.length} records)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting registrations CSV:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export registrations CSV.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  const handleExportEventRegistrationsExcel = async () => {
    try {
      setExportFeedback(null);
      let regsToExport = registrations || [];
      let eventsList = events || [];
      let profsList = profilesList || [];

      if (!isMockMode) {
        try {
          const [regRes, evtRes, profRes] = await Promise.all([
            supabase.from('registrations').select('*').order('registered_at', { ascending: false }),
            supabase.from('events').select('*'),
            supabase.from('profiles').select('*'),
          ]);
          if (regRes.data) regsToExport = regRes.data;
          if (evtRes.data) eventsList = evtRes.data;
          if (profRes.data) profsList = profRes.data;
        } catch (e) {
          console.warn('Supabase fetch registrations for export warning:', e);
        }
      }

      exportEventRegistrationsExcel(regsToExport, eventsList, profsList);
      setExportFeedback({
        type: 'success',
        message: `Event_Participants_Report.xlsx exported successfully (${regsToExport.length} records)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting event registrations report:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export event registrations spreadsheet.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  // 3. Export Single Particular Event Roster (CSV & PDF)
  const handleExportSingleEventCSV = (eventToExport) => {
    if (!eventToExport) return;
    try {
      setExportFeedback(null);
      exportSingleEventRegistrationsCSV(eventToExport, registrations, profilesList);
      const count = (registrations || []).filter((r) => r.event_id === eventToExport.id).length;
      setExportFeedback({
        type: 'success',
        message: `"${eventToExport.title}" Student Roster CSV downloaded (${count} registered)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting event roster CSV:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export event CSV.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  const handleExportSingleEventPDF = (eventToExport) => {
    if (!eventToExport) return;
    try {
      const eventRegs = (registrations || []).filter((r) => r.event_id === eventToExport.id);
      const studentProfiles = eventRegs.map((reg) => {
        const profile = (profilesList || []).find((p) => p.id === reg.student_id);
        return {
          id: reg.id || reg.student_id,
          student_id: reg.student_id,
          registered_at: reg.registered_at,
          name: profile?.full_name || profile?.name || `Student (${reg.student_id?.slice(0, 8)})`,
          username: profile?.username || 'student',
          email: profile?.email || 'N/A',
          college_id: profile?.college_id || reg.student_id?.slice(0, 10),
          role: profile?.role || 'student',
        };
      });
      exportToPDF(eventToExport, studentProfiles);
      setExportFeedback({
        type: 'success',
        message: `"${eventToExport.title}" PDF Roster downloaded (${studentProfiles.length} registered)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting event roster PDF:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export event PDF.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  // 4. Export Overall Attendance (CSV & Excel)
  const handleExportAttendanceCSV = () => {
    try {
      setExportFeedback(null);
      const recordsToUse = filteredAttendanceRecords.length > 0 ? filteredAttendanceRecords : joinedAttendanceRecords;
      exportAttendanceCSV(recordsToUse, events, profilesList);
      setExportFeedback({
        type: 'success',
        message: `SmartSympo_Student_Attendance.csv downloaded (${recordsToUse.length} records)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting attendance CSV:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export attendance CSV.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  const handleExportAttendanceExcel = async () => {
    try {
      setExportFeedback(null);
      exportAttendanceRecordsExcel(joinedAttendanceRecords, events, profilesList);
      setExportFeedback({
        type: 'success',
        message: `Live_Attendance_Report.xlsx exported successfully (${joinedAttendanceRecords.length} records)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting attendance report:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export attendance spreadsheet.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  // 5. Export Email Dispatch Audit Log (CSV & Excel)
  const handleExportEmailDispatchCSV = async () => {
    try {
      setExportFeedback(null);
      exportEmailDispatchCSV(registrations, events, profilesList);
      setExportFeedback({
        type: 'success',
        message: `SmartSympo_Email_Dispatch_Audit.csv downloaded (${(registrations || []).length} logs)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting email dispatch CSV:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export email audit CSV.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  const handleExportEmailDispatchExcel = async () => {
    try {
      setExportFeedback(null);
      exportEmailDispatchExcel(registrations, events, profilesList);
      setExportFeedback({
        type: 'success',
        message: `Email_Dispatch_Audit_Report.xlsx exported successfully (${(registrations || []).length} audit records)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting email dispatch audit report:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export email audit spreadsheet.' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  const handleAdminUnregister = async (eventId, studentId, studentName, eventTitle) => {
    if (!window.confirm(`Are you sure you want to remove the registration of "${studentName || 'this student'}" from "${eventTitle || 'the event'}"?`)) {
      return;
    }
    const res = await unregisterForEvent(eventId, studentId);
    if (res?.success) {
      setExportFeedback({ type: 'success', message: res.message || 'Registration removed successfully.' });
      setTimeout(() => setExportFeedback(null), 3000);
      fetchAttendanceList();
    } else {
      setExportFeedback({ type: 'error', message: res?.message || 'Failed to remove registration.' });
      setTimeout(() => setExportFeedback(null), 3000);
    }
  };

  const handleDeleteClick = async (evt) => {
    if (window.confirm(`Are you sure you want to permanently delete event "${evt.title}"?`)) {
      await deleteEvent(evt.id);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_time || !formData.end_time) {
      setExportFeedback({ message: 'Please fill in all required fields (Title, Start Time, End Time).', type: 'error' });
      setTimeout(() => setExportFeedback(null), 4000);
      return;
    }

    try {
      const result = await addEvent({
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        max_capacity: Number(formData.max_capacity) || 100,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        allowed_radius: Number(formData.allowed_radius) || 200,
      });

      if (result && result.success) {
        setShowAddModal(false);
        setExportFeedback({ message: `Session "${formData.title}" published successfully!`, type: 'success' });
        setTimeout(() => setExportFeedback(null), 4000);
        setFormData({
          title: '',
          description: '',
          category: 'Technical',
          hall_number: 'Hall 1 (Main Auditorium)',
          latitude: '',
          longitude: '',
          allowed_radius: 200,
          start_time: '',
          end_time: '',
          max_capacity: 100,
        });
      } else {
        setExportFeedback({ message: `Event creation failed: ${result?.error?.message || 'Database insert error'}`, type: 'error' });
        setTimeout(() => setExportFeedback(null), 4000);
      }
    } catch (err) {
      setExportFeedback({ message: `Error creating event: ${err?.message || 'Unexpected failure'}`, type: 'error' });
      setTimeout(() => setExportFeedback(null), 4000);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setGeoLoading(false);
      },
      () => {
        console.warn('Unable to retrieve location. Please enter coordinates manually.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'student':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'coordinator':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'admin':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const hasActiveEmergency = (liveAlerts || []).some(
    (a) => a.isEmergency || a.severity === 'emergency' || a.type === 'emergency'
  );

  const activeExportEvent = events.find((e) => e.id === (selectedExportEventId || events[0]?.id)) || events[0];
  const activeExportEventRegs = activeExportEvent ? registrations.filter((r) => r.event_id === activeExportEvent.id) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage events, track live attendance, and oversee attendees.
          </p>
        </div>

        {/* Clean Action Button Group */}
        <div className="flex items-center gap-2 w-full md:w-auto relative">
          {hasActiveEmergency && (
            <button
              onClick={async () => {
                await clearGlobalEmergencyBroadcast();
              }}
              className="px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-medium text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-amber-300 dark:border-amber-700"
              title="Stop emergency broadcast"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>Stop Broadcast</span>
            </button>
          )}

          {/* Secondary: Export CSV */}
          <button
            onClick={handleExportAttendanceCSV}
            className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Primary: + Create Session */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-medium text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Session</span>
          </button>

          {/* "..." Dropdown for secondary actions */}
          <div className="relative">
            <button
              onClick={() => setShowMoreActionsMenu(!showMoreActionsMenu)}
              className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-800 transition cursor-pointer"
              title="More Actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreActionsMenu && (
              <>
                <div
                  onClick={() => setShowMoreActionsMenu(false)}
                  className="fixed inset-0 z-20"
                />
                <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-30 py-1">
                  <button
                    onClick={() => {
                      setShowMoreActionsMenu(false);
                      setShowEmergencyModal(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Emergency Alert</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMoreActionsMenu(false);
                      setIsScannerOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    <span>QR Scanner</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMoreActionsMenu(false);
                      setShowAddCoordinatorModal(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Add Faculty</span>
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                  <button
                    onClick={() => {
                      setShowMoreActionsMenu(false);
                      setAdminTab('reports');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Hub</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Export Feedback Live Banner */}
      {exportFeedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-2xs transition-all animate-fadeIn ${
            exportFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {exportFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{exportFeedback.message}</span>
          </div>
          <button
            onClick={() => setExportFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Top Stats: 3 Clean Bento Stat Cards + System Presence */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Registered Bento Card */}
        <div className="neo-glass-card p-5 space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Total Registered</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {totalRegistrationsCount}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span>Across all tracks & sessions</span>
            <span className="font-mono font-bold text-indigo-400">{events.length} Events</span>
          </div>
        </div>

        {/* Stat 2: Verified Check-In Bento Card with Live Progress Bar */}
        <div className="neo-glass-card p-5 space-y-2 relative overflow-hidden group md:col-span-1 lg:col-span-1 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Checked-In</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {totalAttendedCount}
            </span>
            <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 font-mono">
              ({liveAttendanceRate}%)
            </span>
          </div>
          {/* Visual Turnout Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden mt-1">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-2 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, liveAttendanceRate)}%` }}
            ></div>
          </div>
        </div>

        {/* Stat 3: Pending Check-In Bento Card */}
        <div className="neo-glass-card p-5 space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Pending</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {pendingAttendanceCount}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span>Awaiting scanner verification</span>
            <span className="font-mono text-amber-400 font-bold">{100 - liveAttendanceRate}% Remaining</span>
          </div>
        </div>

        {/* Stat 4: System Presence & Coordinator Node Stats */}
        <div className="neo-glass-card p-5 space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Live Nodes</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{onlineCount}</span>
            <span className="text-xs font-normal text-slate-400">Online</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span>{coordinatorCount} Coordinators Active</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          </div>
        </div>
      </div>

      {/* 3. Section Tabs: Clean Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap sm:flex-nowrap">
        <button
          onClick={() => setAdminTab('attendance')}
          className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            adminTab === 'attendance'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          Live Attendance ({joinedAttendanceRecords.length})
        </button>

        <button
          onClick={() => setAdminTab('events')}
          className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            adminTab === 'events'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          Events & Venues ({events.length})
        </button>

        <button
          onClick={() => setAdminTab('users')}
          className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            adminTab === 'users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          Users & Students ({(profilesList || []).length})
        </button>

        <button
          onClick={() => setAdminTab('reports')}
          className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            adminTab === 'reports'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Hub</span>
        </button>
      </div>

      {/* Tab 1: ATTENDANCE FEED & CLEAN FILTER TABLE */}
      {adminTab === 'attendance' && (
        <div className="neo-glass-card p-6 sm:p-7 space-y-6">
          {/* Clean Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Single Search Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by student name, roll number, college, or event..."
                value={attendanceSearchQuery}
                onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl pl-10 pr-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all font-medium"
              />
            </div>

            {/* Status Toggle Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 text-xs font-bold">
              <button
                onClick={() => setAttendanceStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  attendanceStatusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({joinedAttendanceRecords.length})
              </button>
              <button
                onClick={() => setAttendanceStatusFilter('ATTENDED')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  attendanceStatusFilter === 'ATTENDED'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Verified ({totalAttendedCount})
              </button>
              <button
                onClick={() => setAttendanceStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  attendanceStatusFilter === 'PENDING'
                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Pending ({pendingAttendanceCount})
              </button>
            </div>

            {/* Direct Export Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleExportAttendanceCSV}
                className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/30 shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Export Filtered Attendance Records to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleExportAttendanceExcel}
                className="px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl border border-indigo-500/30 shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Export Attendance Records to Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Clean Data Table with Row Hover Cards */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3.5 px-4 font-mono uppercase text-[11px] tracking-wider">Student & Roll No</th>
                  <th className="py-3.5 px-4 font-mono uppercase text-[11px] tracking-wider">Event Track</th>
                  <th className="py-3.5 px-4 font-mono uppercase text-[11px] tracking-wider">College & Dept</th>
                  <th className="py-3.5 px-4 font-mono uppercase text-[11px] tracking-wider">Status</th>
                  <th className="py-3.5 px-4 font-mono uppercase text-[11px] tracking-wider">Check-in Time</th>
                  <th className="py-3.5 px-4 text-right font-mono uppercase text-[11px] tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredAttendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      {attendanceSearchQuery
                        ? 'No attendance records match your search query.'
                        : 'No student registrations recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredAttendanceRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Column 1: Student Name & Roll No */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${record.student_id}`}
                            alt=""
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{record.student_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                                {record.roll_no}
                              </span>
                              <span>{record.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Event Track */}
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                        <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                          {record.event_title}
                        </div>
                        <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                          {record.hall_number}
                        </div>
                      </td>

                      {/* Column 3: College & Department */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <div className="font-medium truncate max-w-[180px] text-slate-700 dark:text-slate-300">{record.college_name}</div>
                        {record.department && (
                          <div className="text-[10px] text-slate-500">{record.department}</div>
                        )}
                      </td>

                      {/* Column 4: Status Badge */}
                      <td className="py-3.5 px-4">
                        {record.is_attended ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified ✅
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Pending ⏳
                          </span>
                        )}
                      </td>

                      {/* Column 5: Check-in Time */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {record.checked_in_at ? (
                          <span className="text-emerald-400 font-bold">
                            {new Date(record.checked_in_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Column 6: Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleAdminUnregister(record.event_id, record.student_id, record.student_name, record.event_title)}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold"
                          title="Remove this registration"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: EVENTS & VENUES MANAGEMENT */}
      {adminTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => {
            const regCount = registrations.filter((r) => r.event_id === evt.id).length;
            const checkedInCount = attendanceLogs.filter(
              (log) => log.event_id === evt.id && log.status === 'Checked-In'
            ).length;
            const occupancyPercent = Math.round((checkedInCount / (evt.max_capacity || 100)) * 100);

            return (
              <div
                key={evt.id}
                className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {evt.category || 'Technical'}
                    </span>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {evt.hall_number || 'Main Hall'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {evt.description || 'Interactive symposium workshop & live seminar track.'}
                    </p>
                  </div>

                  {/* Occupancy Indicator */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Occupancy</span>
                      <span className="text-slate-900 font-bold">{regCount} / {evt.max_capacity || 100} ({occupancyPercent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedRosterEvent(evt);
                      setShowRosterModal(true);
                    }}
                    className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition cursor-pointer"
                  >
                    View Roster
                  </button>
                  <button
                    onClick={() => handleEditClick(evt)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(evt)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: USER GOVERNANCE & ROLES */}
      {adminTab === 'users' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">User Accounts & Roles</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {adminCount}/5 Admins • {coordinatorCount} Coordinators • {studentCount} Students
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportStudentsCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="Export Registered Students to CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Students CSV</span>
              </button>
              <button
                onClick={handleExportCoordinatorsCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                title="Export Coordinator Directory & Logins to CSV"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>Export Coordinators CSV</span>
              </button>
              <button
                onClick={() => setShowAddCoordinatorModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>Add Coordinator</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">User Profile</th>
                  <th className="px-4 py-3">Email & Identifier</th>
                  <th className="px-4 py-3">Current Role</th>
                  <th className="px-4 py-3 text-right">Role Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!profilesList || profilesList.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  profilesList.map((user) => {
                    const isCurrent = user.id === currentUser?.id;
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-slate-900 flex items-center gap-2.5">
                          <img
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                            alt=""
                            className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 p-0.5 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              {user.full_name || user.name || 'User'}
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">@{user.username || 'user'}</div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-slate-600">
                          <div className="font-medium text-slate-800">{user.email}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{user.college_id || user.id?.slice(0, 10)}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(user.role)}`}
                          >
                            {user.role}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {user.role !== 'coordinator' && (
                              <button
                                onClick={() => handleRoleChange(user.id, 'coordinator')}
                                disabled={updatingUser === user.id}
                                className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
                              >
                                Set Coordinator
                              </button>
                            )}
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleRoleChange(user.id, 'admin')}
                                disabled={updatingUser === user.id || adminCount >= 5}
                                className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer disabled:opacity-50"
                              >
                                Promote Admin
                              </button>
                            )}
                            {user.role !== 'student' && (
                              <button
                                onClick={() => handleRoleChange(user.id, 'student')}
                                disabled={updatingUser === user.id || isCurrent}
                                className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
                              >
                                Set Student
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAccount(user.id, user.full_name || user.name || user.email)}
                              disabled={updatingUser === user.id}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: CSV REPORTS & EXPORT HUB */}
      {adminTab === 'reports' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Hero Banner for Export Center */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-7 rounded-3xl border border-slate-800 shadow-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 border border-indigo-400/30 px-3 py-0.5 rounded-full text-indigo-300 inline-block mb-2">
                  Symposium Data & Analytics Center
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Export & Reporting Center
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Generate dedicated UTF-8 encoded CSV spreadsheets and formatted reports for student attendance, registrations, coordinator logins, and specific event rosters.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportMultiSheetUsers}
                  className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-2 transition cursor-pointer active:scale-98"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>All-in-One Excel Workbook</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: Event-Specific Student Registration Exporter */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                    <Users className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Event-Specific Student Registrations
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Select any symposium event to inspect and export the exact list of registered students
                </p>
              </div>

              {/* Event Selector Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Select Event:</label>
                <select
                  value={selectedExportEventId || events[0]?.id || ''}
                  onChange={(e) => setSelectedExportEventId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-indigo-600 max-w-[220px] truncate"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({registrations.filter((r) => r.event_id === evt.id).length} registered)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Event Details & Direct Actions */}
            {activeExportEvent ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{activeExportEvent.title}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        {activeExportEvent.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>Venue: <strong className="text-slate-800 font-bold">{activeExportEvent.hall_number || 'Main Venue'}</strong></span>
                      <span>•</span>
                      <span>Total Registered: <strong className="text-indigo-700 font-bold">{activeExportEventRegs.length}</strong> / {activeExportEvent.max_capacity || 100}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => handleExportSingleEventCSV(activeExportEvent)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                      title="Download CSV of students registered for this event"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Event CSV</span>
                    </button>

                    <button
                      onClick={() => handleExportSingleEventPDF(activeExportEvent)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Download PDF Roster of students registered for this event"
                    >
                      <FileDown className="w-3.5 h-3.5 text-rose-600" />
                      <span>Export PDF Roster</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedRosterEvent(activeExportEvent);
                        setShowRosterModal(true);
                      }}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Manage Roster</span>
                    </button>
                  </div>
                </div>

                {/* Preview Table of Registered Students for this event */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">#</th>
                        <th className="px-4 py-2.5">Student Name</th>
                        <th className="px-4 py-2.5">Email</th>
                        <th className="px-4 py-2.5">College / Institution</th>
                        <th className="px-4 py-2.5">Registration Time</th>
                        <th className="px-4 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeExportEventRegs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-400 font-medium">
                            No students have registered for "{activeExportEvent.title}" yet.
                          </td>
                        </tr>
                      ) : (
                        activeExportEventRegs.slice(0, 5).map((reg, idx) => {
                          const profile = (profilesList || []).find((p) => p.id === reg.student_id);
                          const isAttended = Boolean(reg.attended || reg.is_attended);
                          return (
                            <tr key={reg.id || idx} className="hover:bg-slate-50/70">
                              <td className="px-4 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="px-4 py-2.5 font-semibold text-slate-900">
                                {reg.student_name || profile?.full_name || profile?.name || `Student (${reg.student_id?.slice(0, 8)})`}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600">{reg.student_email || profile?.email || 'N/A'}</td>
                              <td className="px-4 py-2.5 text-slate-600">{profile?.college_name || profile?.college || 'Main Campus'}</td>
                              <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                                {reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isAttended
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {isAttended ? 'Verified' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {activeExportEventRegs.length > 5 && (
                    <div className="p-2.5 bg-slate-50 text-center text-[11px] text-slate-500 border-t border-slate-200 font-medium">
                      Showing 5 of {activeExportEventRegs.length} registered students. Download the full CSV for complete details.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Section 2: 6 Dedicated Export Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Student Attendance Report */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {totalAttendedCount} Verified
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">Student Attendance Report</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Full door check-in logs with verified attendee names, roll numbers, venues, exact timestamps, and verification status.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={handleExportAttendanceCSV}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportAttendanceExcel}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* Card 2: All Student Registrations */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl">
                    <Users className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    {totalRegistrationsCount} Total
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">All Student Registrations</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Master registry of all student registrations across all symposium sessions with pass codes, contact info, and status.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={handleExportAllRegistrationsCSV}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportEventRegistrationsExcel}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* Card 3: Coordinators & Login Presence */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl">
                    <UserCheck className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    {coordinatorCount} Coords • {onlineCount} Online
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">Coordinators & Logins</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Coordinator roster, assigned departments, contact info, live login status (online presence), and security passcode status.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={handleExportCoordinatorsCSV}
                  className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportCoordinatorsExcel}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* Card 4: Registered Students Directory */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-sky-50 text-sky-700 rounded-2xl">
                    <Building className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                    {studentCount} Students
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">Student Directory</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  All registered student profiles, colleges, departments, roll numbers, contact emails, and registration dates.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={handleExportStudentsCSV}
                  className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportStudentsExcel}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* Card 5: Email & Pass Dispatch Audit */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-purple-50 text-purple-700 rounded-2xl">
                    <Mail className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                    {registrations.length} Passes Sent
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">Email & Pass Delivery Log</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Audit trail of registration passes dispatched to students, including recipient email, timestamp, and delivery status.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={handleExportEmailDispatchCSV}
                  className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportEmailDispatchExcel}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* Card 6: All System Users Directory */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 bg-slate-100 text-slate-700 rounded-2xl">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    {(profilesList || []).length} Accounts
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">Master Users Directory</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Complete user directory of all accounts (students, coordinators, administrators) with permission roles and identifiers.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={handleExportAllUsersCSV}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportMultiSheetUsers}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Export multi-sheet Excel with tabs for Students, Coordinators, Admins"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Multi-Sheet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Create Event Modal with Location & Radius */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200/90 p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative text-slate-900 animate-slideUp text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                Create Symposium Track
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
                  placeholder="e.g. Cyber Security Workshop"
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
                  placeholder="Brief event description, speaker info, prerequisites..."
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
                    Max Capacity
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
                  placeholder="e.g. Hall 1 (Main Auditorium)"
                  value={formData.hall_number}
                  onChange={(e) => setFormData({ ...formData, hall_number: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    Location Coordinates
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={geoLoading}
                    className="px-3 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Crosshair className="w-3 h-3" />
                    {geoLoading ? 'Detecting...' : 'Use My Location'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 text-[10px] block mb-1 font-semibold">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="e.g. 13.082680"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-[11px] font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-[10px] block mb-1 font-semibold">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="e.g. 80.270721"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-[11px] font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 font-bold flex items-center gap-1.5 mb-1">
                    <Ruler className="w-3 h-3 text-amber-600" />
                    <span>Allowed Check-in Radius</span>
                    <span className="text-[10px] text-slate-500 font-normal">(meters)</span>
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    value={formData.allowed_radius}
                    onChange={(e) => setFormData({ ...formData, allowed_radius: e.target.value })}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Students must be within this radius to check in. Default: 200m.
                  </p>
                </div>
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
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-600 font-medium"
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
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-600 font-medium"
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

      {/* QR Scanner Modal for Guest Check-ins */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        selectedHall="Admin Scanner"
        isGuestMode={true}
      />

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200/90 p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative text-slate-900 animate-slideUp text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                Edit Symposium Track
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
                <label className="text-slate-700 font-bold block mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Description
                </label>
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
                  <label className="text-slate-700 font-bold block mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-amber-600" />
                    Max Capacity / Seats
                  </label>
                  <input
                    type="number"
                    value={editFormData.max_capacity}
                    onChange={(e) => setEditFormData({ ...editFormData, max_capacity: e.target.value })}
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
                  value={editFormData.hall_number}
                  onChange={(e) => setEditFormData({ ...editFormData, hall_number: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 font-medium"
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
                    value={editFormData.start_time}
                    onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-600 font-medium"
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
                    value={editFormData.end_time}
                    onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-2.5 py-2 focus:outline-none focus:border-indigo-600 font-medium"
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

      {/* Master Security Code Passcode Confirmation Modal */}
      {securityModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 p-6 md:p-7 shadow-2xl relative text-left overflow-hidden space-y-5 animate-slideUp">
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Lock className="w-6 h-6 text-rose-600" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                  High Security Verification
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {securityModalState.actionType === 'bulk'
                    ? 'Confirm Bulk Account Wipe'
                    : 'Confirm Account Deletion'}
                </h3>
              </div>
            </div>

            {/* Prompt Description */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <p className="font-bold text-slate-800">
                {securityModalState.actionType === 'bulk'
                  ? 'Enter Master Security Code to confirm clearing ALL accounts:'
                  : `Enter Master Security Code to delete this user [${securityModalState.targetUserName}]:`}
              </p>
              <p className="text-[11px] text-slate-500">
                This deletion cannot be undone. Enter the strict system master passcode to proceed.
              </p>
            </div>

            {/* Error Notification inside modal */}
            {securityModalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-bold animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{securityModalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleConfirmSecurityAction} className="space-y-4">
              <div>
                <label className="text-slate-700 font-bold block mb-1.5 text-xs flex items-center justify-between">
                  <span>Master Security Code</span>
                  <span className="text-[10px] font-mono text-slate-400">Passcode Required</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Enter Security Code (e.g. 2027)"
                    value={enteredPasscode}
                    onChange={(e) => {
                      setEnteredPasscode(e.target.value);
                      if (securityModalError) setSecurityModalError(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-10 pr-3.5 py-3 text-sm focus:outline-none focus:border-rose-600 focus:bg-white transition-all font-mono tracking-widest"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {securityModalState.actionType === 'bulk'
                      ? 'Wipe All Accounts'
                      : 'Verify & Delete User'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSecurityModalState({ isOpen: false, actionType: 'single', targetUserId: null, targetUserName: '' });
                    setEnteredPasscode('');
                    setSecurityModalError(null);
                  }}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Coordinator Modal */}
      {showAddCoordinatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white max-w-md w-full rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-2xl space-y-4 text-left relative animate-slideUp">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Add New Coordinator</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Create staff coordinator account in Supabase</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCoordinatorModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoordinator} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ramesh Kumar"
                  value={coordForm.fullName}
                  onChange={(e) => setCoordForm({ ...coordForm, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="coordinator@college.edu"
                  value={coordForm.email}
                  onChange={(e) => setCoordForm({ ...coordForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Password / PIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 chars"
                    value={coordForm.password}
                    onChange={(e) => setCoordForm({ ...coordForm, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={coordForm.phone}
                    onChange={(e) => setCoordForm({ ...coordForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Department / Institution
                </label>
                <input
                  type="text"
                  placeholder="e.g. Department of Computer Science"
                  value={coordForm.department}
                  onChange={(e) => setCoordForm({ ...coordForm, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-medium"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={creatingCoord}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{creatingCoord ? 'Creating Coordinator...' : 'Create Coordinator'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddCoordinatorModal(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
