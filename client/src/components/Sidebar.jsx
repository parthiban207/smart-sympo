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
      label: 'Symposium Programme',
      path: isAdmin ? '/admin' : isCoordinator ? '/coordinator' : '/student',
      icon: BookOpen,
      roles: ['student', 'coordinator', 'admin'],
    },
    {
      label: 'Paper Agenda & Passes',
      path: '/student',
      icon: Ticket,
      roles: ['student', 'coordinator', 'admin'],
      badge: 'TOTP',
    },
    {
      label: 'Camera Scanner',
      path: '/scanner',
      icon: QrCode,
      roles: ['coordinator', 'admin'],
      badge: 'Live',
    },
    {
      label: 'Lecture Hall Console',
      path: '/coordinator',
      icon: Building2,
      roles: ['coordinator', 'admin'],
    },
    {
      label: 'Governance Hub',
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
        className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-30 bg-[#FDFBF7] dark:bg-[#121417] border-r border-[#E7E3D8] dark:border-[#2A2E38] transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Logo & Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E7E3D8] dark:border-[#2A2E38] shrink-0">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-[#8B1E24] text-white flex items-center justify-center font-serif font-bold text-xl shadow-xs shrink-0">
              S
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-base font-bold text-[#1E293B] dark:text-white tracking-tight">
                    SmartSympo
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                  Academic Ledger
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* User Credential Badge */}
        {!isCollapsed && currentUser && (
          <div className="px-4 py-3 border-b border-[#E7E3D8] dark:border-[#2A2E38] bg-[#F5F1E8]/60 dark:bg-[#1A1D24]/60">
            <div className="flex items-center gap-2.5">
              <img
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.id || 'user'}`}
                alt="User Avatar"
                className="w-8 h-8 rounded-md bg-white dark:bg-slate-800 border border-[#E7E3D8] dark:border-slate-700 p-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#1E293B] dark:text-slate-200 truncate">
                  {currentUser.full_name || currentUser.name || 'Smart User'}
                </p>
                <div className="flex items-center gap-1 mt-0.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span className="text-[10px] uppercase font-bold text-[#8B1E24] dark:text-red-400">
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-[#8B1E24] text-white shadow-xs dark:bg-[#8B1E24] dark:text-white'
                    : 'text-slate-700 dark:text-slate-400 hover:text-[#8B1E24] dark:hover:text-white hover:bg-[#F5F1E8] dark:hover:bg-[#1E222A]'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <IconComponent
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-[#8B1E24] dark:group-hover:text-red-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#8B1E24]/10 text-[#8B1E24] dark:bg-[#8B1E24]/20 dark:text-red-300'
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
        <div className="p-3 border-t border-[#E7E3D8] dark:border-[#2A2E38] space-y-1 shrink-0 bg-[#F5F1E8]/40 dark:bg-[#1A1D24]/40">
          <button
            onClick={toggleDarkMode}
            title="Toggle Theme"
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-400 hover:bg-[#F5F1E8] dark:hover:bg-[#1E222A] transition cursor-pointer ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-[#8B1E24] shrink-0" />
            )}
            {!isCollapsed && (
              <span className="truncate flex-1 text-left">
                {isDarkMode ? 'Parchment Light' : 'Obsidian Dark'}
              </span>
            )}
          </button>

          {currentUser && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Account Settings"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-400 hover:bg-[#F5F1E8] dark:hover:bg-[#1E222A] transition cursor-pointer ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <Settings className="w-4 h-4 text-slate-500 shrink-0" />
              {!isCollapsed && <span className="truncate flex-1 text-left">Credential Settings</span>}
            </button>
          )}

          {currentUser && (
            <button
              onClick={handleLogout}
              title="Log Out"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <LogOut className="w-4 h-4 text-rose-600 shrink-0" />
              {!isCollapsed && <span className="truncate flex-1 text-left">Exit Session</span>}
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="w-full mt-2 pt-2 border-t border-[#E7E3D8] dark:border-[#2A2E38] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer py-1"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* 2. Mobile Responsive Drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 animate-fadeIn"
        />
      )}

      <aside
        className={`md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-[#FDFBF7] dark:bg-[#121417] border-r border-[#E7E3D8] dark:border-[#2A2E38] flex flex-col transition-transform duration-300 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E7E3D8] dark:border-[#2A2E38]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#8B1E24] text-white flex items-center justify-center font-serif font-bold text-lg">
              S
            </div>
            <span className="font-serif font-bold text-lg text-slate-900 dark:text-white">SmartSympo</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-[#F5F1E8] dark:hover:bg-[#1E222A]"
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
                className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#8B1E24] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-400 hover:bg-[#F5F1E8] dark:hover:bg-[#1E222A]'
                }`}
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#8B1E24]/10 text-[#8B1E24] dark:bg-[#8B1E24]/20 dark:text-red-300">
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
