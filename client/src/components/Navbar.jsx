// agent-notes: { ctx: "Clean Top Header with Breadcrumb title, Quick Search bar, Three-dots Slide-out Drawer Menu, Notification Bell, and User Profile chip", deps: ["src/context/AppContext.jsx", "src/components/UserSettingsModal.jsx", "src/components/NotificationCenter.jsx", "src/components/EmergencyBroadcastModal.jsx", "src/utils/calendarExport.js", "src/utils/exportReports.ts", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-09-01" }

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import UserSettingsModal from './UserSettingsModal';
import NotificationCenter from './NotificationCenter';
import EmergencyBroadcastModal from './EmergencyBroadcastModal';
import { generateMultiEventICS, downloadICSFile } from '../utils/calendarExport';
import { exportAttendanceCSV } from '../utils/exportReports';
import {
  Bell,
  Menu,
  Settings,
  LogOut,
  Search,
  ChevronRight,
  MoreVertical,
  X,
  BookOpen,
  Building2,
  ShieldAlert,
  QrCode,
  Calendar,
  Layers,
  Sparkles,
  Ticket,
  FileSpreadsheet,
  Radio,
  User,
} from 'lucide-react';

export default function Navbar({ onToggleMobileMenu }) {
  const {
    currentUser,
    signOutFromSupabase,
    unreadNotificationCount,
    events,
    registrations,
    profilesList,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeRole = currentUser?.role || 'student';
  const avatarSeed = currentUser?.id || 'smart-user';
  const username = currentUser?.username || currentUser?.email?.split('@')[0] || 'user';
  const fullName = currentUser?.full_name || currentUser?.name || 'Smart User';

  const handleLogout = async () => {
    setIsDrawerOpen(false);
    await signOutFromSupabase();
    navigate('/login', { replace: true });
  };

  const handleExportFullSchedule = () => {
    setIsDrawerOpen(false);
    if (!events || events.length === 0) return;
    const icsData = generateMultiEventICS(events, 'SmartSympo 2026 Programme');
    downloadICSFile('smart-sympo-full-schedule.ics', icsData);
  };

  const handleExportAttendance = () => {
    setIsDrawerOpen(false);
    exportAttendanceCSV(registrations || [], events || [], profilesList || []);
  };

  const handleEmergencyAlert = () => {
    setIsDrawerOpen(false);
    setIsEmergencyModalOpen(true);
  };

  // Dynamic Breadcrumb Title mapping
  const getBreadcrumbTitle = () => {
    switch (location.pathname) {
      case '/admin':
        return 'Admin Dashboard';
      case '/coordinator':
        return 'Venues & Halls';
      case '/scanner':
        return 'QR Scanner';
      case '/student':
      default:
        return 'Browse Events';
    }
  };

  return (
    <>
      {/* Clean Neo-Glass Top Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">

            {/* 1. Breadcrumb Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={onToggleMobileMenu}
                className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                title="Open Mobile Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Link to="/" className="hover:text-slate-900 flex items-center gap-2.5 transition">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                    S
                  </div>
                  <span className="hidden sm:inline font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500">
                    SmartSympo
                  </span>
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="font-semibold text-slate-900">
                  {getBreadcrumbTitle()}
                </span>
              </div>
            </div>

            {/* 2. Quick Search Input (⌘K) */}
            <div className="hidden md:flex items-center flex-1 max-w-sm mx-4">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sessions, delegates..."
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                />
                <kbd className="hidden lg:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 border border-slate-300">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* 3. Controls: Slide-out Drawer Trigger, Notification Bell & User Profile */}
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <button
                onClick={() => setIsNotificationOpen(true)}
                title="Notifications"
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer relative"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* User Profile Chip */}
              {currentUser && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  title="Account Settings"
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer text-left"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`}
                    alt="Avatar"
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 shrink-0"
                  />
                  <div className="hidden sm:block">
                    <div className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[100px]">
                      {fullName}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-none">
                      @{username} • <span className="capitalize font-medium">{activeRole}</span>
                    </div>
                  </div>
                  <Settings className="w-3.5 h-3.5 text-slate-400 hidden sm:block ml-0.5" />
                </button>
              )}

              {/* Three-Dots Button Trigger for Slide-out Drawer Menu */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                title="Open Quick Menu"
                aria-label="Open Slide-out Menu"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Slide-out Drawer Component */}
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsDrawerOpen(false)}
      />

      {/* Slide-over Panel (Right Side) */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 max-w-full bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
              S
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Quick Menu</h2>
              <p className="text-[10px] font-mono text-slate-400 uppercase font-bold">SmartSympo 2026</p>
            </div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            title="Close Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Badge Info */}
        {currentUser && (
          <div className="p-4 mx-4 mt-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
            <img
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`}
              alt="Avatar"
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{fullName}</p>
              <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
              <span className="inline-block mt-0.5 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                {activeRole}
              </span>
            </div>
          </div>
        )}

        {/* Drawer Links & Quick Actions */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 text-left">
          {/* Navigation Section */}
          <div className="space-y-1">
            <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Navigation
            </p>

            <button
              onClick={() => {
                setIsDrawerOpen(false);
                navigate('/student');
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                location.pathname === '/student'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate">Student Dashboard</p>
                <p className="text-[10px] font-normal text-slate-400">Events, tracks & passes</p>
              </div>
            </button>

            {(activeRole === 'coordinator' || activeRole === 'admin') && (
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('/coordinator');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                  location.pathname === '/coordinator'
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-cyan-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">Venues & Coordinator</p>
                  <p className="text-[10px] font-normal text-slate-400">Halls & attendance logs</p>
                </div>
              </button>
            )}

            {(activeRole === 'coordinator' || activeRole === 'admin') && (
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('/scanner');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                  location.pathname === '/scanner'
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">QR Entry Scanner</p>
                  <p className="text-[10px] font-normal text-slate-400">Live delegate check-in</p>
                </div>
              </button>
            )}

            {activeRole === 'admin' && (
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('/admin');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                  location.pathname === '/admin'
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-purple-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">Admin Analytics</p>
                  <p className="text-[10px] font-normal text-slate-400">Full control & reports</p>
                </div>
              </button>
            )}
          </div>

          {/* Quick Actions Section */}
          <div className="pt-4 border-t border-slate-200 space-y-1.5">
            <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              Actions
            </p>

            <button
              onClick={handleExportAttendance}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer text-left"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>⬇ Export Attendance CSV</span>
            </button>

            <button
              onClick={handleExportFullSchedule}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer text-left"
            >
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>📅 Export Full Schedule (.ics)</span>
            </button>

            <button
              onClick={handleEmergencyAlert}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
            >
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>🚨 Emergency Alert</span>
            </button>

            <button
              onClick={() => {
                setIsDrawerOpen(false);
                setIsSettingsOpen(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer text-left"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>⚙️ Account Preferences</span>
            </button>
          </div>
        </div>

        {/* Drawer Footer (Logout) */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Notification Center */}
      <NotificationCenter isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />

      {/* User Settings Modal */}
      {isSettingsOpen && (
        <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Emergency Broadcast Modal */}
      <EmergencyBroadcastModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />
    </>
  );
}
