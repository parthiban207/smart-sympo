// agent-notes: { ctx: "Collapsible Academic Symposium Sidebar with serif headers, role-based navigation, and dark parchment theme", deps: ["src/context/AppContext.jsx", "src/components/UserSettingsModal.jsx", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-08-31" }

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import UserSettingsModal from './UserSettingsModal';
import {
  BookOpen,
  Ticket,
  QrCode,
  Building2,
  ShieldAlert,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

export default function Sidebar({ isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen }) {
  const { currentUser, signOutFromSupabase, isDarkMode, toggleDarkMode } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const activeRole = currentUser?.role || 'student';
  const isAdmin = activeRole === 'admin';
  const isCoordinator = activeRole === 'coordinator';

  const handleLogout = async () => {
    await signOutFromSupabase();
    navigate('/login', { replace: true });
  };

  const navItems = [
    {
      label: 'Browse Events',
      path: isAdmin ? '/admin' : isCoordinator ? '/coordinator' : '/student',
      icon: BookOpen,
      roles: ['student', 'coordinator', 'admin'],
    },
    {
      label: 'My Digital Pass',
      path: '/student',
      icon: Ticket,
      roles: ['student', 'coordinator', 'admin'],
      badge: 'TOTP',
    },
    {
      label: 'QR Scanner',
      path: '/scanner',
      icon: QrCode,
      roles: ['coordinator', 'admin'],
      badge: 'Live',
    },
    {
      label: 'Venues & Halls',
      path: '/coordinator',
      icon: Building2,
      roles: ['coordinator', 'admin'],
    },
    {
      label: 'Admin Dashboard',
      path: '/admin',
      icon: ShieldAlert,
      roles: ['admin'],
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.roles.includes(activeRole));

  return (
    <>
      {/* 1. Desktop Fixed Left Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-30 bg-white/90 dark:bg-[#0B0F19]/90 border-r border-slate-200 dark:border-slate-800 backdrop-blur-md transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Logo & Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 text-white flex items-center justify-center font-extrabold text-xl shadow-md shadow-indigo-500/20 shrink-0">
              S
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                    SmartSympo
                  </span>
                </div>
                <span className="text-[10px] font-mono text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-wider uppercase font-bold">
                  Tech Fest 2026
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* User Credential Badge */}
        {!isCollapsed && currentUser && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <img
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.id || 'user'}`}
                alt="User Avatar"
                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
                  {currentUser.full_name || currentUser.name || 'Smart User'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                    {activeRole}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path + item.label}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 dark:bg-indigo-600 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <IconComponent
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-cyan-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Quick Controls */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1 shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
          <button
            onClick={toggleDarkMode}
            title="Toggle Theme"
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            {!isCollapsed && (
              <span className="truncate flex-1 text-left">
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>

          {currentUser && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Account Settings"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <Settings className="w-4 h-4 text-slate-400 shrink-0" />
              {!isCollapsed && <span className="truncate flex-1 text-left">Settings</span>}
            </button>
          )}

          {currentUser && (
            <button
              onClick={handleLogout}
              title="Log Out"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
              {!isCollapsed && <span className="truncate flex-1 text-left">Logout</span>}
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="w-full mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer py-1"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Responsive Drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-xs z-40 animate-fadeIn"
        />
      )}

      <aside
        className={`md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-white dark:bg-[#0B0F19] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white flex items-center justify-center font-extrabold text-lg shadow-xs">
              S
            </div>
            <span className="font-extrabold text-lg text-slate-900 dark:text-white">SmartSympo</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path + item.label + '-mobile'}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Account Settings Modal */}
      {isSettingsOpen && (
        <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
}
