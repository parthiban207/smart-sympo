// agent-notes: { ctx: "Academic Symposium Conference Masthead & Navigation Bar with serif headings, date badge, parchment theme toggle, and section underline tabs", deps: ["src/context/AppContext.jsx", "src/components/UserSettingsModal.jsx", "src/components/NotificationCenter.jsx", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-08-31" }

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import UserSettingsModal from './UserSettingsModal';
import NotificationCenter from './NotificationCenter';
import {
  BookOpen,
  Bell,
  Sun,
  Moon,
  Menu,
  Settings,
  LogOut,
  QrCode,
  Building2,
  ShieldAlert,
} from 'lucide-react';

export default function Navbar({ onToggleMobileMenu }) {
  const { currentUser, signOutFromSupabase, isDarkMode, toggleDarkMode, unreadNotificationCount } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const activeRole = currentUser?.role || 'student';

  const avatarSeed = currentUser?.id || 'smart-user';
  const username = currentUser?.username || currentUser?.email?.split('@')[0] || 'user';
  const fullName = currentUser?.full_name || currentUser?.name || 'Smart User';

  const handleLogout = async () => {
    await signOutFromSupabase();
    navigate('/login', { replace: true });
  };

  const navLinks = [
    {
      label: 'Symposium Programme',
      path: '/student',
      icon: BookOpen,
      roles: ['student', 'coordinator', 'admin'],
    },
    {
      label: 'Camera Scanner',
      path: '/scanner',
      icon: QrCode,
      roles: ['coordinator', 'admin'],
    },
    {
      label: 'Hall Console',
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

  const visibleNavLinks = navLinks.filter((item) => item.roles.includes(activeRole));

  return (
    <>
      {/* Editorial Conference Masthead */}
      <header className="sticky top-0 z-20 bg-[#FDFBF7]/90 dark:bg-[#121417]/90 backdrop-blur-md border-b border-[#E7E3D8] dark:border-[#2A2E38] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* 1. Academic Masthead Brand */}
            <div className="flex items-center gap-3">
              <button
                onClick={onToggleMobileMenu}
                className="md:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-[#F5F1E8] dark:hover:bg-[#1E222A] border border-[#E7E3D8] dark:border-[#2A2E38] transition cursor-pointer"
                title="Open Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link to="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-[#8B1E24] text-white flex items-center justify-center font-serif font-bold text-lg shadow-xs">
                  S
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-lg font-bold tracking-tight text-[#1E293B] dark:text-slate-100">
                      SmartSympo
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#8B1E24]/10 text-[#8B1E24] dark:bg-[#8B1E24]/20 dark:text-red-300 border border-[#8B1E24]/20 uppercase">
                      2026
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 tracking-wide uppercase hidden sm:block">
                    Proceedings & Programme Ledger
                  </span>
                </div>
              </Link>
            </div>

            {/* 2. Desktop Section Underline Tabs */}
            <nav className="hidden md:flex items-center gap-6">
              {visibleNavLinks.map((link) => {
                const IconComp = link.icon;
                const isActive = location.pathname === link.path;

                return (
                  <Link
                    key={link.path + link.label}
                    to={link.path}
                    className={`flex items-center gap-2 py-5 text-xs font-semibold tracking-tight transition-all relative ${
                      isActive
                        ? 'text-[#8B1E24] dark:text-red-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-slate-200'
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-[#8B1E24] dark:text-red-400' : 'text-slate-400'}`} />
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B1E24] dark:bg-red-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* 3. Controls: Dark Mode, Notification Bell & User Badge */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Parchment/Obsidian Dark Mode Switcher */}
              <button
                onClick={toggleDarkMode}
                title="Toggle Theme Mode"
                className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-[#F5F1E8] dark:hover:bg-[#1E222A] border border-[#E7E3D8] dark:border-[#2A2E38] transition cursor-pointer"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-[#8B1E24]" />
                )}
              </button>

              {/* Notification Bell Drawer */}
              <button
                onClick={() => setIsNotificationOpen(true)}
                title="Notifications"
                className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-[#F5F1E8] dark:hover:bg-[#1E222A] border border-[#E7E3D8] dark:border-[#2A2E38] transition cursor-pointer relative"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#8B1E24] text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center border-2 border-[#FDFBF7] dark:border-[#121417]">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* Credential Badge Chip */}
              {currentUser && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  title="Credential Profile"
                  className="flex items-center gap-2.5 p-1 pl-2 pr-3 rounded-lg bg-[#F5F1E8] dark:bg-[#1A1D24] hover:bg-[#EAE5D7] dark:hover:bg-[#252832] border border-[#E7E3D8] dark:border-[#2A2E38] transition cursor-pointer text-left group"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`}
                    alt="Avatar"
                    className="w-7 h-7 rounded-md bg-white dark:bg-slate-800 border border-[#E7E3D8] dark:border-slate-700 p-0.5 shrink-0"
                  />
                  <div className="hidden sm:block">
                    <div className="text-xs font-bold text-[#1E293B] dark:text-slate-200 leading-tight truncate max-w-[110px]">
                      {fullName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono leading-none">
                      @{username} • <span className="capitalize text-[#8B1E24] dark:text-red-400 font-bold">{activeRole}</span>
                    </div>
                  </div>
                  <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#8B1E24] dark:group-hover:text-red-400 transition-colors hidden sm:block ml-0.5" />
                </button>
              )}

              {/* Logout Button */}
              {currentUser && (
                <button
                  onClick={handleLogout}
                  title="Log Out"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-[#E7E3D8] dark:border-[#2A2E38] text-xs font-semibold transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Slide-Over Notification Center */}
      <NotificationCenter isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />

      {/* User Settings Modal */}
      {isSettingsOpen && (
        <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
}
