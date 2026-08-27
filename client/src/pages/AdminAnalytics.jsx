// agent-notes: { ctx: "Admin analytics dashboard with realtime registrations subscription, Excel spreadsheet export system, and role management", deps: ["src/context/AppContext.jsx", "src/hooks/usePresence.ts", "src/components/QRScannerModal.jsx", "src/utils/exportReports.ts", "src/supabaseClient.js", "lucide-react"], state: "active", last: "antigravity@2026-08-26" }

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { usePresence } from '../hooks/usePresence';
import { supabase, isMockMode } from '../supabaseClient';
import {
  exportAllUsersExcel,
  exportMultiSheetUsersWorkbook,
  exportStudentsExcel,
  exportCoordinatorsExcel,
  exportAdminsExcel,
  exportEventRegistrationsExcel,
  exportAttendanceRecordsExcel,
  exportEmailDispatchExcel,
} from '../utils/exportReports';
import QRScannerModal from '../components/QRScannerModal';
import ViewRegisteredStudentsModal from '../components/ViewRegisteredStudentsModal';
import EmergencyBroadcastModal from '../components/EmergencyBroadcastModal';
import {
  ShieldCheck, PlusCircle, MapPin, Activity, Radio, UserCheck, Users, Signal,
  Globe, Crosshair, Ruler, FileText, ScanLine, Clock, Hash, CheckCircle2, AlertCircle,
  Pencil, Trash2, KeyRound, RefreshCw, Lock, FileSpreadsheet, Download, FileDown,
  CalendarCheck, ClipboardCheck, Loader2, StopCircle, Mail, Send, CheckCircle, AlertTriangle,
  Search, Building, Filter
} from 'lucide-react';

export default function AdminAnalytics() {
  const {
    events, fetchEvents, registrations, setRegistrations, attendanceLogs, setAttendanceLogs,
    addEvent, updateEvent, deleteEvent, guestCheckins, currentUser, profilesList, setProfilesList,
    updateUserRole, createCoordinatorAccount, updateUserPassCode, deleteUserAccount, clearAllAccounts, liveAlerts,
    clearGlobalEmergencyBroadcast
  } = useApp();
  const { onlineUsers, onlineCount } = usePresence();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddCoordinatorModal, setShowAddCoordinatorModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [adminTab, setAdminTab] = useState('attendance'); // 'attendance' | 'events' | 'users'
  const [coordForm, setCoordForm] = useState({ fullName: '', email: '', password: '', phone: '', department: '' });
  const [creatingCoord, setCreatingCoord] = useState(false);

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
            fetchAttendanceList(); // Re-fetch updated list instantly
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendance_logs' },
          () => {
            fetchAttendanceList(); // Re-fetch updated attendance logs instantly
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  const [showRosterModal, setShowRosterModal] = useState(false);
  const [selectedRosterEvent, setSelectedRosterEvent] = useState(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(null);
  const [roleFeedback, setRoleFeedback] = useState(null);

  // Real-Time Attendance Search & Filter State
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('ALL'); // 'ALL' | 'ATTENDED' | 'PENDING'

  // Spreadsheet Export Loading & Feedback State
  const [exportingReport, setExportingReport] = useState(null);
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

  // Combined Real-Time Joined Attendance Table: Registrations joined with Profiles, Events, & Attendance Logs
  const joinedAttendanceRecords = (registrations || []).map((reg) => {
    const matchedProfile = reg.profiles || (profilesList || []).find((p) => p.id === reg.student_id);
    const matchedEvent = reg.events || (events || []).find((e) => e.id === reg.event_id);
    const matchedLog = (attendanceLogs || []).find(
      (log) => log.student_id === reg.student_id && log.event_id === reg.event_id
    );
    const coordinatorProfile = reg.scanned_by
      ? (profilesList || []).find((p) => p.id === reg.scanned_by || p.email === reg.scanned_by || p.full_name === reg.scanned_by)
      : null;

    const isAttended = Boolean(reg.attended || reg.checked_in_at || matchedLog);
    const checkInTime = reg.checked_in_at || reg.attended_at || matchedLog?.check_in_time || null;

    return {
      id: reg.id,
      registration_id: reg.id,
      student_id: reg.student_id,
      student_name:
        matchedProfile?.full_name ||
        matchedProfile?.name ||
        reg.student_name ||
        matchedProfile?.email ||
        'Student',
      roll_no:
        matchedProfile?.roll_no ||
        matchedProfile?.college_id ||
        reg.roll_no ||
        reg.college_id ||
        'N/A',
      college_name:
        matchedProfile?.college ||
        matchedProfile?.college_name ||
        reg.college ||
        'Main Campus',
      department:
        matchedProfile?.department ||
        reg.department ||
        'General',
      phone:
        matchedProfile?.phone ||
        matchedProfile?.phone_number ||
        'N/A',
      email: matchedProfile?.email || reg.student_email || 'N/A',
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
      record.college_id.toLowerCase().includes(query) ||
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
    setRoleFeedback(null);
    const res = await updateUserRole(targetUserId, newRole);
    if (res.success) {
      setRoleFeedback({ type: 'success', text: res.message });
    } else {
      setRoleFeedback({ type: 'error', text: res.message });
    }
    setUpdatingUser(null);
  };

  const handleCreateCoordinator = async (e) => {
    e.preventDefault();
    if (!coordForm.fullName.trim() || !coordForm.email.trim() || !coordForm.password.trim()) {
      setRoleFeedback({ type: 'error', text: 'Please fill in Coordinator Full Name, Email, and Password.' });
      return;
    }
    setCreatingCoord(true);
    const res = await createCoordinatorAccount(coordForm);
    if (res.success) {
      setRoleFeedback({ type: 'success', text: res.message });
      setShowAddCoordinatorModal(false);
      setCoordForm({ fullName: '', email: '', password: '', phone: '', department: '' });
      setTimeout(() => setRoleFeedback(null), 4000);
    } else {
      setRoleFeedback({ type: 'error', text: res.message });
    }
    setCreatingCoord(false);
  };

  const handleGeneratePassCode = async (targetUserId) => {
    setUpdatingUser(targetUserId);
    setRoleFeedback(null);
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    const res = await updateUserPassCode(targetUserId, newPin);
    if (res.success) {
      setRoleFeedback({ type: 'success', text: res.message });
    } else {
      setRoleFeedback({ type: 'error', text: res.message });
    }
    setUpdatingUser(null);
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

  // 1. Single User Deletion - Trigger Master Security Code Confirmation ("2027")
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
        // User cancelled prompt
        return;
      }
      const trimmedCode = String(inputCode).trim();
      if (trimmedCode !== '2027') {
        const errorText = 'Access Denied: Incorrect Security Code!';
        setRoleFeedback({ text: errorText, type: 'error' });
        setTimeout(() => setRoleFeedback(null), 4000);
        return;
      }

      const res = await deleteUserAccount(userId, trimmedCode);
      if (res.success) {
        setRoleFeedback({ text: `Account "${formattedName}" deleted successfully!`, type: 'success' });
        setTimeout(() => setRoleFeedback(null), 3000);
      } else {
        const errorText = res.message || 'Access Denied: Incorrect Security Code!';
        setRoleFeedback({ text: errorText, type: 'error' });
        setTimeout(() => setRoleFeedback(null), 4000);
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

  // 2. Bulk Clear Accounts - Trigger Master Security Code Confirmation ("2027")
  const handleClearAllAccounts = async () => {
    setSecurityModalError(null);
    setEnteredPasscode('');

    const promptText = 'Enter Master Security Code to confirm clearing ALL accounts:';
    const inputCode = typeof window !== 'undefined' && typeof window.prompt === 'function'
      ? window.prompt(promptText)
      : undefined;

    if (inputCode !== undefined) {
      if (inputCode === null) {
        // User cancelled prompt
        return;
      }
      const trimmedCode = String(inputCode).trim();
      if (trimmedCode !== '2027') {
        const errorText = 'Operation Aborted: Invalid Security Code';
        setRoleFeedback({ text: errorText, type: 'error' });
        setTimeout(() => setRoleFeedback(null), 4000);
        return;
      }

      const res = await clearAllAccounts(trimmedCode);
      if (res.success) {
        setRoleFeedback({ text: 'All accounts deleted successfully!', type: 'success' });
        setTimeout(() => setRoleFeedback(null), 3000);
      } else {
        const errorText = res.message || 'Operation Aborted: Invalid Security Code';
        setRoleFeedback({ text: errorText, type: 'error' });
        setTimeout(() => setRoleFeedback(null), 4000);
      }
      return;
    }

    setSecurityModalState({
      isOpen: true,
      actionType: 'bulk',
      targetUserId: null,
      targetUserName: 'All Registered Accounts',
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
        setRoleFeedback({ text: errorText, type: 'error' });
        setTimeout(() => setRoleFeedback(null), 4000);
        return;
      }

      const res = await deleteUserAccount(securityModalState.targetUserId, trimmedCode);
      if (res.success) {
        setSecurityModalState({ isOpen: false, actionType: 'single', targetUserId: null, targetUserName: '' });
        setRoleFeedback({ text: `Account "${securityModalState.targetUserName}" deleted successfully!`, type: 'success' });
        setTimeout(() => setRoleFeedback(null), 3000);
      } else {
        const errorText = res.message || 'Access Denied: Incorrect Security Code!';
        setSecurityModalError(errorText);
      }
    } else if (securityModalState.actionType === 'bulk') {
      if (trimmedCode !== '2027') {
        const errorText = 'Operation Aborted: Invalid Security Code';
        setSecurityModalError(errorText);
        setRoleFeedback({ text: errorText, type: 'error' });
        setTimeout(() => setRoleFeedback(null), 4000);
        return;
      }

      const res = await clearAllAccounts(trimmedCode);
      if (res.success) {
        setSecurityModalState({ isOpen: false, actionType: 'bulk', targetUserId: null, targetUserName: '' });
        setRoleFeedback({ text: 'All accounts deleted successfully!', type: 'success' });
        setTimeout(() => setRoleFeedback(null), 3000);
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

  // 1. Export All Registered Users by Role (Multi-Sheet Workbook) -> All_Users_Directory_By_Role.xlsx
  const handleExportMultiSheetUsers = async () => {
    try {
      setExportingReport('multisheet');
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
    } finally {
      setExportingReport(null);
    }
  };

  // 1b. Export Students Sheet -> Registered_Students_Report.xlsx
  const handleExportStudents = async () => {
    try {
      setExportingReport('students');
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
    } finally {
      setExportingReport(null);
    }
  };

  // 1c. Export Coordinators Sheet -> Coordinators_Directory_Report.xlsx
  const handleExportCoordinators = async () => {
    try {
      setExportingReport('coordinators');
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
    } finally {
      setExportingReport(null);
    }
  };

  // 1d. Export Admin Staff Sheet -> Admin_Staff_Report.xlsx
  const handleExportAdmins = async () => {
    try {
      setExportingReport('admins');
      setExportFeedback(null);
      const users = await getCombinedUsersForExport();
      const count = users.filter((u) => (u.role || '').toLowerCase() === 'admin').length;
      exportAdminsExcel(users);
      setExportFeedback({
        type: 'success',
        message: `Admin_Staff_Report.xlsx exported successfully (${count} administrators)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting admin staff report:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export admin staff spreadsheet.' });
      setTimeout(() => setExportFeedback(null), 4000);
    } finally {
      setExportingReport(null);
    }
  };

  // 1e. Export All Users Single Sheet -> All_Users_Report.xlsx
  const handleExportUsers = async () => {
    try {
      setExportingReport('users');
      setExportFeedback(null);
      const usersToExport = await getCombinedUsersForExport();
      exportAllUsersExcel(usersToExport);
      setExportFeedback({
        type: 'success',
        message: `All_Users_Report.xlsx exported successfully (${usersToExport.length} records)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting users report:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export users report spreadsheet.' });
      setTimeout(() => setExportFeedback(null), 4000);
    } finally {
      setExportingReport(null);
    }
  };

  // 2. Export Event-wise Registrations (.xlsx) -> Event_Participants_Report.xlsx
  const handleExportEventRegistrations = async () => {
    try {
      setExportingReport('registrations');
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

          if (regRes.data && regRes.data.length > 0) {
            regsToExport = regRes.data;
          }
          if (evtRes.data && evtRes.data.length > 0) {
            eventsList = evtRes.data;
          }
          if (profRes.data && profRes.data.length > 0) {
            profsList = profRes.data;
          }
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
    } finally {
      setExportingReport(null);
    }
  };

  // 3. Export Overall Attendance Records (.xlsx) -> Live_Attendance_Report.xlsx
  const handleExportAttendance = async () => {
    try {
      setExportingReport('attendance');
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
    } finally {
      setExportingReport(null);
    }
  };

  // 4. Export Email Dispatch Audit Log (.xlsx) -> Email_Dispatch_Audit_Report.xlsx
  const handleExportEmailDispatch = async () => {
    try {
      setExportingReport('emails');
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

          if (regRes.data && regRes.data.length > 0) {
            regsToExport = regRes.data;
          }
          if (evtRes.data && evtRes.data.length > 0) {
            eventsList = evtRes.data;
          }
          if (profRes.data && profRes.data.length > 0) {
            profsList = profRes.data;
          }
        } catch (e) {
          console.warn('Supabase fetch email audit log error:', e);
        }
      }

      exportEmailDispatchExcel(regsToExport, eventsList, profsList);
      setExportFeedback({
        type: 'success',
        message: `Email_Dispatch_Audit_Report.xlsx exported successfully (${regsToExport.length} audit records)!`,
      });
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err) {
      console.error('Error exporting email dispatch audit report:', err);
      setExportFeedback({ type: 'error', message: 'Failed to export email audit spreadsheet.' });
      setTimeout(() => setExportFeedback(null), 4000);
    } finally {
      setExportingReport(null);
    }
  };

  const handleDeleteClick = async (evt) => {
    if (window.confirm(`Are you sure you want to permanently delete event "${evt.title}"?`)) {
      await deleteEvent(evt.id);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_time || !formData.end_time) return;

    const userRole = (currentUser?.role || localStorage.getItem('smart_sympo_active_role') || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'coordinator') {
      setRoleFeedback({ text: 'Access Denied: Only admins or coordinators can create events.', type: 'error' });
      setTimeout(() => setRoleFeedback(null), 4000);
      return;
    }

    const result = await addEvent({
      ...formData,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString(),
      max_capacity: Number(formData.max_capacity),
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      allowed_radius: Number(formData.allowed_radius) || 200,
    });

    if (result && result.success) {
      setShowAddModal(false);
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
      console.warn(`Event creation failed: ${result?.error?.message || 'Database insert error'}`);
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

  const guestLogs = (guestCheckins || []).concat(
    attendanceLogs.filter((log) => log.guest_name || log.is_guest)
  );

  const handleExportAttendanceCSV = () => {
    const dataToExport = filteredAttendanceRecords.map((r) => ({
      'Student Name': r.student_name,
      'Roll No / College ID': r.roll_no,
      'Email': r.email,
      'College': r.college_name,
      'Department': r.department || 'N/A',
      'Event': r.event_title,
      'Venue': r.hall_number,
      'Category': r.category,
      'Status': r.is_attended ? 'Verified' : 'Pending',
      'Check-in Time': r.checked_in_at ? new Date(r.checked_in_at).toLocaleString() : 'Not Checked In',
    }));
    exportToExcel(dataToExport, 'Attendance', `SmartSympo_Attendance_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* 1. Sleek Admin Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Admin Console
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Attendance verification, event operations, and system user management
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {hasActiveEmergency && (
            <button
              onClick={async () => {
                await clearGlobalEmergencyBroadcast();
              }}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-amber-500"
              title="Stop emergency broadcast"
            >
              <StopCircle className="w-3.5 h-3.5 text-rose-700" />
              <span>Stop Broadcast</span>
            </button>
          )}

          <button
            onClick={() => setShowEmergencyModal(true)}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-rose-600" />
            <span>Emergency Alert</span>
          </button>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ScanLine className="w-3.5 h-3.5 text-indigo-600" />
            <span>QR Scanner</span>
          </button>

          <button
            onClick={() => setShowAddCoordinatorModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>Add Coordinator</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats: 3 Minimalist Pastel Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1: Total Registered */}
        <div className="bg-indigo-50/70 border border-indigo-100/90 p-5 rounded-2xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Total Registered</span>
          </div>
          <div className="text-3xl font-extrabold text-indigo-950 font-mono tracking-tight">
            {totalRegistrationsCount}
          </div>
          <p className="text-[11px] text-indigo-700/80 font-medium">
            Across all symposium sessions
          </p>
        </div>

        {/* Stat 2: Verified Attendance */}
        <div className="bg-emerald-50/70 border border-emerald-100/90 p-5 rounded-2xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Verified Attendance</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-950 font-mono tracking-tight">
            {totalAttendedCount}
          </div>
          <p className="text-[11px] text-emerald-700/80 font-medium">
            {liveAttendanceRate}% overall turnout confirmed
          </p>
        </div>

        {/* Stat 3: Pending Check-In */}
        <div className="bg-amber-50/70 border border-amber-100/90 p-5 rounded-2xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Pending Check-In</span>
          </div>
          <div className="text-3xl font-extrabold text-amber-950 font-mono tracking-tight">
            {pendingAttendanceCount}
          </div>
          <p className="text-[11px] text-amber-700/80 font-medium">
            Registered attendees awaiting door check-in
          </p>
        </div>
      </div>

      {/* 3. Section Tabs: Clean Pill Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-1">
        <button
          onClick={() => setAdminTab('attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            adminTab === 'attendance'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          Attendance Feed ({joinedAttendanceRecords.length})
        </button>

        <button
          onClick={() => setAdminTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            adminTab === 'events'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          Events & Venues ({events.length})
        </button>

        <button
          onClick={() => setAdminTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            adminTab === 'users'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          User Governance ({(profilesList || []).length})
        </button>
      </div>

      {/* Tab 1: ATTENDANCE FEED & CLEAN FILTER TABLE */}
      {adminTab === 'attendance' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          {/* Clean Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Single Sleek Search Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by student name, roll number, college, or event..."
                value={attendanceSearchQuery}
                onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/90 text-slate-900 rounded-xl pl-10 pr-3.5 py-2 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Simple Status Toggle Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0 text-xs font-semibold">
              <button
                onClick={() => setAttendanceStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  attendanceStatusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({joinedAttendanceRecords.length})
              </button>
              <button
                onClick={() => setAttendanceStatusFilter('ATTENDED')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  attendanceStatusFilter === 'ATTENDED'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Verified ({totalAttendedCount})
              </button>
              <button
                onClick={() => setAttendanceStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  attendanceStatusFilter === 'PENDING'
                    ? 'bg-white text-slate-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({pendingAttendanceCount})
              </button>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportAttendanceCSV}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Export Current Table Records to CSV/Excel"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Simplified Clean Data Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-100">
                  <th className="py-3 px-4">Student Name & Roll No</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">College</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Check-in Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      {attendanceSearchQuery
                        ? 'No attendance records match your search query.'
                        : 'No student registrations recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredAttendanceRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Column 1: Student Name & Roll No */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${record.student_id}`}
                            alt=""
                            className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 p-0.5 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{record.student_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {record.roll_no} • {record.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Event */}
                      <td className="py-3.5 px-4 text-slate-800">
                        <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                          {record.event_title}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {record.hall_number}
                        </div>
                      </td>

                      {/* Column 3: College */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-medium truncate max-w-[180px]">{record.college_name}</div>
                        {record.department && (
                          <div className="text-[10px] text-slate-400">{record.department}</div>
                        )}
                      </td>

                      {/* Column 4: Status Badge (Clean Green / Gray) */}
                      <td className="py-3.5 px-4">
                        {record.is_attended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/80">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Column 5: Check-in Time */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {record.checked_in_at ? (
                          new Date(record.checked_in_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((evt) => {
            const regCount = registrations.filter((r) => r.event_id === evt.id).length;
            const checkedInCount = attendanceLogs.filter(
              (log) => log.event_id === evt.id && log.status === 'Checked-In'
            ).length;
            const occupancyPercent = Math.round((checkedInCount / (evt.max_capacity || 100)) * 100);

            return (
              <div
                key={evt.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/80">
                    {evt.category}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 font-mono">
                    {occupancyPercent}% Turnout
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 truncate">{evt.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{evt.hall_number}</span>
                  </p>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                    <span>Checked-In: <strong>{checkedInCount}</strong></span>
                    <span>Registered: <strong>{regCount}</strong> / {evt.max_capacity || 100}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                  <button
                    onClick={() => {
                      setSelectedRosterEvent(evt);
                      setShowRosterModal(true);
                    }}
                    className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-indigo-700 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Users className="w-3 h-3" />
                    Roster ({regCount})
                  </button>
                  <button
                    onClick={() => handleEditClick(evt)}
                    className="py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg font-medium text-[11px] transition cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(evt)}
                    className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-medium text-[11px] transition cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: USER GOVERNANCE & ROLES */}
      {adminTab === 'users' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">User Accounts & Roles</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {adminCount}/5 Admins • {coordinatorCount} Coordinators • {studentCount} Students
              </p>
            </div>
            <button
              onClick={() => setShowAddCoordinatorModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Add Coordinator
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-100">
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
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-slate-900 flex items-center gap-2.5">
                          <img
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                            alt=""
                            className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 p-0.5 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              {user.full_name || user.name || 'User'}
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">@{user.username || 'user'}</div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-slate-600">
                          <div>{user.email}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{user.college_id || user.id?.slice(0, 10)}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-lg border ${getRoleBadgeStyle(user.role)}`}
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
                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
                              >
                                Set Coordinator
                              </button>
                            )}
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleRoleChange(user.id, 'admin')}
                                disabled={updatingUser === user.id || adminCount >= 5}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer disabled:opacity-50"
                              >
                                Promote Admin
                              </button>
                            )}
                            {user.role !== 'student' && (
                              <button
                                onClick={() => handleRoleChange(user.id, 'student')}
                                disabled={updatingUser === user.id || isCurrent}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
                              >
                                Set Student
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAccount(user.id, user.full_name || user.name || user.email)}
                              disabled={updatingUser === user.id}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Enhanced Create Event Modal with Location & Radius */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                Create Symposium Event
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
                  placeholder="e.g. Cyber Security Workshop"
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
                  placeholder="Brief event description, speaker info, prerequisites..."
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
                    Max Capacity
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
                  placeholder="e.g. Hall 1 (Main Auditorium)"
                  value={formData.hall_number}
                  onChange={(e) => setFormData({ ...formData, hall_number: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-semibold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    Location Coordinates
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={geoLoading}
                    className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Crosshair className="w-3 h-3" />
                    {geoLoading ? 'Detecting...' : 'Use My Location'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 text-[10px] block mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="e.g. 13.082680"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-[11px] font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-[10px] block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="e.g. 80.270721"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 text-[11px] font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold flex items-center gap-1.5 mb-1">
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
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Students must be within this radius to check in. Default: 200m.
                  </p>
                </div>
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

      {/* QR Scanner Modal for Guest Check-ins */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        selectedHall="Admin Scanner"
        isGuestMode={true}
      />

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                Edit Symposium Event
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
                <label className="text-slate-700 font-semibold block mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Description
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white resize-none transition-all"
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
                  <label className="text-slate-700 font-semibold block mb-1 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-amber-600" />
                    Max Capacity / Seats
                  </label>
                  <input
                    type="number"
                    value={editFormData.max_capacity}
                    onChange={(e) => setEditFormData({ ...editFormData, max_capacity: e.target.value })}
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
                  value={editFormData.hall_number}
                  onChange={(e) => setEditFormData({ ...editFormData, hall_number: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600"
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
                    value={editFormData.start_time}
                    onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
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

      {/* Master Security Code Passcode Confirmation Modal */}
      {securityModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 p-6 md:p-7 shadow-2xl relative text-left overflow-hidden space-y-5 animate-scaleUp">
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
              <p className="font-semibold text-slate-800">
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
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white max-w-md w-full rounded-3xl border border-slate-200 p-6 shadow-2xl space-y-4 text-left relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Add New Coordinator</h3>
                  <p className="text-[11px] text-slate-500">Create staff coordinator account in Supabase</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCoordinatorModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCoordinator} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ramesh Kumar"
                  value={coordForm.fullName}
                  onChange={(e) => setCoordForm({ ...coordForm, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="coordinator@college.edu"
                  value={coordForm.email}
                  onChange={(e) => setCoordForm({ ...coordForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Password / PIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 chars"
                    value={coordForm.password}
                    onChange={(e) => setCoordForm({ ...coordForm, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={coordForm.phone}
                    onChange={(e) => setCoordForm({ ...coordForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Department / Institution
                </label>
                <input
                  type="text"
                  placeholder="e.g. Department of Computer Science"
                  value={coordForm.department}
                  onChange={(e) => setCoordForm({ ...coordForm, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={creatingCoord}
                  className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{creatingCoord ? 'Creating Coordinator...' : 'Create Coordinator'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddCoordinatorModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
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
