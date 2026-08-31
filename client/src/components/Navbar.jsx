// agent-notes: { ctx: "Clean Top Header with Breadcrumb title, Quick Search bar, Dark Mode toggle, Notification Bell, and User Profile chip — zero duplicated nav links", deps: ["src/context/AppContext.jsx", "src/components/UserSettingsModal.jsx", "src/components/NotificationCenter.jsx", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-08-31" }

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import UserSettingsModal from './UserSettingsModal';
import NotificationCenter from './NotificationCenter';
import {
  Bell,
  Sun,
  Moon,
  Menu,
  Settings,
  LogOut,
  Search,
  ChevronRight,
} from 'lucide-react';

export default function Navbar({ onToggleMobileMenu }) {
  const { currentUser, signOutFromSupabase, isDarkMode, toggleDarkMode, unreadNotificationCount } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeRole = currentUser?.role || 'student';
  const avatarSeed = currentUser?.id || 'smart-user';
  const username = currentUser?.username || currentUser?.email?.split('@')[0] || 'user';
  const fullName = currentUser?.full_name || currentUser?.name || 'Smart User';

  const handleLogout = async () => {
    await signOutFromSupabase();
    navigate('/login', { replace: true });
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
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#0B0F19]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">

            {/* 1. Breadcrumb Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={onToggleMobileMenu}
                className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                title="Open Mobile Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Link to="/" className="hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-2.5 transition">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                    S
                  </div>
                  <span className="hidden sm:inline font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400">
                    SmartSympo
                  </span>
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                <span className="font-semibold text-slate-900 dark:text-white">
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
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                />
                <kbd className="hidden lg:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* 3. Controls: Dark Mode, Notification Bell & User Profile */}
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                title="Toggle Theme"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              {/* Notification Bell */}
              <button
                onClick={() => setIsNotificationOpen(true)}
                title="Notifications"
                className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition cursor-pointer relative"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#121417]">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* User Profile Chip */}
              {currentUser && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  title="Settings"
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition cursor-pointer text-left"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`}
                    alt="Avatar"
                    className="w-7 h-7 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shrink-0"
                  />
                  <div className="hidden sm:block">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 leading-tight truncate max-w-[100px]">
                      {fullName}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-none">
                      @{username} • <span className="capitalize font-medium">{activeRole}</span>
                    </div>
                  </div>
                  <Settings className="w-3.5 h-3.5 text-slate-400 hidden sm:block ml-0.5" />
                </button>
              )}

              {/* Logout */}
              {currentUser && (
                <button
                  onClick={handleLogout}
                  title="Log Out"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-800 text-xs font-medium transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notification Center */}
      <NotificationCenter isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />

      {/* User Settings Modal */}
      {isSettingsOpen && (
        <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
}
