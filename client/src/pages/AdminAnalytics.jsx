// agent-notes: { ctx: "Admin analytics dashboard with presence widget, role management (5-admin limit & student signup hardening), event creation, and guest check-in logs", deps: ["src/context/AppContext.jsx", "src/hooks/usePresence.ts", "src/components/QRScannerModal.jsx", "lucide-react"], state: "active", last: "antigravity@2026-07-31" }

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { usePresence } from '../hooks/usePresence';
import QRScannerModal from '../components/QRScannerModal';
import ViewRegisteredStudentsModal from '../components/ViewRegisteredStudentsModal';
import EmergencyBroadcastModal from '../components/EmergencyBroadcastModal';
import {
  ShieldCheck, PlusCircle, MapPin, Activity, Radio, UserCheck, Users, Signal,
  Globe, Crosshair, Ruler, FileText, ScanLine, Clock, Hash, CheckCircle2, AlertCircle,
  Pencil, Trash2, KeyRound, RefreshCw, Lock
} from 'lucide-react';

export default function AdminAnalytics() {
  const {
    events, registrations, attendanceLogs, addEvent, updateEvent, deleteEvent,
    guestCheckins, currentUser, profilesList, updateUserRole, updateUserPassCode
  } = useApp();
  const { onlineUsers, onlineCount } = usePresence();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [showRosterModal, setShowRosterModal] = useState(false);
  const [selectedRosterEvent, setSelectedRosterEvent] = useState(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(null);
  const [roleFeedback, setRoleFeedback] = useState(null);

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

  const handleDeleteClick = async (evt) => {
    if (window.confirm(`Are you sure you want to permanently delete event "${evt.title}"?`)) {
      await deleteEvent(evt.id);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_time || !formData.end_time) return;

    if (currentUser?.role !== 'admin') {
      alert('Access Denied: Only admins can create events.');
      return;
    }

    await addEvent({
      ...formData,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString(),
      max_capacity: Number(formData.max_capacity),
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      allowed_radius: Number(formData.allowed_radius) || 200,
    });

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
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
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
        alert('Unable to retrieve your location. Please enter coordinates manually.');
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

  const guestLogs = (guestCheckins || []).concat(
    attendanceLogs.filter((log) => log.guest_name || log.is_guest)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Admin Control Panel & Governance
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-Time Presence Tracking, User Role Governance & System Security Control
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-rose-500 animate-pulse"
          >
            <Radio className="w-4 h-4 text-white" />
            Emergency Broadcast
          </button>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ScanLine className="w-4 h-4 text-indigo-600" />
            Guest QR Scanner
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Create & Map Event
          </button>
        </div>
      </div>

      {/* Realtime Active Users Online Live Presence Stat Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <Signal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Live Presence Stats
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  {onlineCount} Online Now
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">Supabase Realtime Presence Channel (`online-users`)</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Presence Active</span>
          </div>
        </div>

        {/* Online Users Avatar List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {onlineUsers.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-slate-500">
              No active presence sessions detected.
            </div>
          ) : (
            onlineUsers.map((u) => (
              <div
                key={u.user_id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 text-xs shadow-2xs"
              >
                <div className="relative">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${u.user_id}`}
                    alt="User"
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 p-0.5"
                  />
                  <span className="relative flex h-2.5 w-2.5 absolute -bottom-0.5 -right-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">{u.full_name}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">@{u.username}</div>
                </div>

                <span
                  className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(u.role)}`}
                >
                  {u.role}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Manage System Users & Role Governance Data Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-3 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Manage System Users & Role Governance
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {adminCount}/5 Admins Limit
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Promote or demote user roles enforcing PostgreSQL RLS security & 5-Admin maximum cap
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              Admins: <strong>{adminCount}</strong>/5
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              Coordinators: <strong>{coordinatorCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              Students: <strong>{studentCount}</strong>
            </span>
          </div>
        </div>

        {/* Feedback Banner */}
        {roleFeedback && (
          <div
            className={`p-3 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold ${
              roleFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {roleFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{roleFeedback.text}</span>
            </div>
            <button
              onClick={() => setRoleFeedback(null)}
              className="text-slate-500 hover:text-slate-900 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Users & Roles Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-3">User Profile</th>
                <th className="px-4 py-3">Email / Identifier</th>
                <th className="px-4 py-3">Security Code (Passcode)</th>
                <th className="px-4 py-3">Current Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Role Governance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!profilesList || profilesList.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No registered user profiles found in database.
                  </td>
                </tr>
              ) : (
                profilesList.map((user) => {
                  const isOnline = onlineUsers.some((u) => u.user_id === user.id);
                  const isCurrent = user.id === currentUser?.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-3">
                        <img
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                          alt="Avatar"
                          className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 p-0.5"
                        />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {user.full_name || user.name || 'User'}
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">@{user.username || 'user'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{user.email}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{user.college_id || user.id?.slice(0, 12)}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                            {user.pass_code || '2005'}
                          </span>
                          <button
                            onClick={() => handleGeneratePassCode(user.id)}
                            disabled={updatingUser === user.id}
                            title="Generate New Security Passcode PIN"
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${updatingUser === user.id ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                            Offline
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {user.role !== 'coordinator' && (
                            <button
                              onClick={() => handleRoleChange(user.id, 'coordinator')}
                              disabled={updatingUser === user.id}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Set Coordinator
                            </button>
                          )}
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleRoleChange(user.id, 'admin')}
                              disabled={updatingUser === user.id || adminCount >= 5}
                              title={adminCount >= 5 ? 'Max 5 Admins reached (limit 5)' : 'Promote to Admin'}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Promote to Admin
                            </button>
                          )}
                          {user.role !== 'student' && (
                            <button
                              onClick={() => handleRoleChange(user.id, 'student')}
                              disabled={updatingUser === user.id || isCurrent}
                              title={isCurrent ? 'Cannot demote yourself' : 'Demote to Student'}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Demote to Student
                            </button>
                          )}
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

      {/* Analytics Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {events.map((evt) => {
          const regCount = registrations.filter((r) => r.event_id === evt.id).length;
          const checkedInCount = attendanceLogs.filter(
            (log) => log.event_id === evt.id && log.status === 'Checked-In'
          ).length;
          const occupancyPercent = Math.round((checkedInCount / evt.max_capacity) * 100);

          return (
            <div
              key={evt.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden group hover:border-slate-300 transition-all"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {evt.category}
                </span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {occupancyPercent}% Filled
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 truncate">{evt.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-amber-600" />
                  <span className="truncate">{evt.hall_number}</span>
                </p>
                {evt.latitude && evt.longitude && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                    <Globe className="w-2.5 h-2.5 text-indigo-600" />
                    {evt.latitude}, {evt.longitude} • {evt.allowed_radius || 200}m radius
                  </p>
                )}
              </div>

              {/* Progress bar & headcount analytics */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                  <span>
                    Checked-In: <strong className="text-emerald-700">{checkedInCount}</strong>
                  </span>
                  <span>
                    Registered: <strong className="text-slate-800">{regCount}</strong> /{' '}
                    {evt.max_capacity || evt.max_seats || 100}
                  </span>
                </div>
              </div>

              {/* Event Control & Roster Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                <button
                  onClick={() => {
                    setSelectedRosterEvent(evt);
                    setShowRosterModal(true);
                  }}
                  className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer border border-indigo-200"
                  title="View registered student roster"
                >
                  <Users className="w-3 h-3" />
                  Roster ({regCount})
                </button>
                <button
                  onClick={() => handleEditClick(evt)}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer border border-slate-200"
                  title="Edit event details"
                >
                  <Pencil className="w-3 h-3 text-slate-600" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(evt)}
                  className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer border border-rose-200"
                  title="Delete event permanently"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Guest Registration Logs Data Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live Guest Registration Logs</h3>
              <p className="text-[11px] text-slate-500">QR-scanned guest check-ins appear here instantly via Realtime</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
            <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>{guestLogs.length} Guest{guestLogs.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-3">Guest Name</th>
                <th className="px-4 py-3">Event / Venue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Scanned At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {guestLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No guest check-ins yet. Scan a guest QR code to see entries appear in real-time.
                  </td>
                </tr>
              ) : (
                guestLogs.map((log, idx) => {
                  const matchedEvt = events.find((e) => e.id === log.event_id);
                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-900 flex items-center gap-2 font-semibold">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{log.guest_name || log.student_id?.slice(0, 16) || 'Guest'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>{matchedEvt ? matchedEvt.title : 'Symposium Session'}</div>
                        <div className="text-[10px] text-slate-400">{log.hall_number || 'Main Venue'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {log.status || 'Checked-In'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString() : 'Just now'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* System-Wide Live Attendance Activity Stream Data Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">System-Wide Live Attendance Feed</h3>
              <p className="text-[11px] text-slate-500">Realtime postgres_changes stream for multi-venue check-ins</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Supabase Realtime Listening</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Event / Venue</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No live check-in logs recorded yet. Door scans will stream here live instantly.
                  </td>
                </tr>
              ) : (
                attendanceLogs.map((log) => {
                  const matchedEvt = events.find((e) => e.id === log.event_id);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-900 flex items-center gap-2 font-semibold">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{log.student_id?.slice(0, 16)}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div>{matchedEvt ? matchedEvt.title : 'Symposium Session'}</div>
                        <div className="text-[10px] text-slate-400">{log.hall_number || 'Main Venue'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {log.status || 'Checked-In'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString() : 'Just now'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
