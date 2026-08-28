// agent-notes: { ctx: "Ultra-minimalist modern Navbar with sleek branding, clean navigation pills, profile avatar, and logout", deps: ["src/context/AppContext.jsx", "src/components/UserSettingsModal.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-27" }

import { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import UserSettingsModal from './UserSettingsModal';
import { Wifi, LogOut } from 'lucide-react';

export default function Navbar() {
  const { currentUser, switchRole, signOutFromSupabase } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const activeRole = currentUser?.role || 'student';
  const isCoordinatorRole = activeRole === 'coordinator';
  const isAdminRole = activeRole === 'admin';

  const avatarSeed = currentUser?.id || 'smart-user';
  const username = currentUser?.username || currentUser?.email?.split('@')[0] || 'user';
  const fullName = currentUser?.full_name || currentUser?.name || 'Smart User';

  const handleLogout = async () => {
    await signOutFromSupabase();
    navigate('/login', { replace: true });
  };

  const handleGuardedNavigation = useCallback((targetPath) => {
    navigate(targetPath);
  }, [navigate]);

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80 px-3 sm:px-6 py-2 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* 1. Sleek Logo / Institutional Name */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs text-white group-hover:bg-indigo-700 transition-colors">
              <Wifi className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight hidden sm:inline">
              Smart Coordinator
            </span>
          </Link>

          {/* 2. Clean Navigation Tabs (Horizontally scrollable on mobile) */}
          <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 overflow-x-auto scrollbar-none max-w-[65vw] sm:max-w-none">
            <button
              onClick={() => handleGuardedNavigation('/student')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                location.pathname.startsWith('/student') || location.pathname === '/'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Student Pass
            </button>

            {(isCoordinatorRole || isAdminRole) && (
              <>
                <button
                  onClick={() => handleGuardedNavigation('/coordinator')}
                  className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    location.pathname === '/coordinator'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Coordinator
                </button>
                <button
                  onClick={() => handleGuardedNavigation('/scanner')}
                  className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    location.pathname.startsWith('/scanner')
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  QR Scanner
                </button>
              </>
            )}

            {isAdminRole && (
              <button
                onClick={() => handleGuardedNavigation('/admin')}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-white text-rose-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin Panel
              </button>
            )}
          </nav>

          {/* 3. Sleek User Avatar & Logout Action */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Account Settings"
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:pl-1.5 sm:pr-2.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer border border-transparent hover:border-slate-200 text-left"
            >
              <img
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`}
                alt="Avatar"
                className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 p-0.5 shrink-0"
              />
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[110px]">{fullName}</div>
                <div className="text-[10px] text-slate-400 font-mono leading-none">@{username}</div>
              </div>
            </button>

            <button
              onClick={handleLogout}
              title="Log Out"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Account Settings Modal */}
      <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
