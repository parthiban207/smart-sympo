// agent-notes: { ctx: "Cyber dark glassmorphic Navbar with mandatory PIN guard on every role-sensitive tab switch", deps: ["src/context/AppContext.jsx", "src/components/UserSettingsModal.jsx", "src/components/RoleSwitchGuardModal.jsx", "lucide-react"], state: "active", last: "antigravity@2026-07-31" }

import { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import UserSettingsModal from './UserSettingsModal';
import RoleSwitchGuardModal from './RoleSwitchGuardModal';
import { Calendar, UserCheck, ShieldCheck, Wifi, LogOut, Settings, QrCode } from 'lucide-react';

export default function Navbar() {
  const { currentUser, switchRole, signOutFromSupabase } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Role Switch Guard state
  const [guardOpen, setGuardOpen] = useState(false);
  const [guardTargetRole, setGuardTargetRole] = useState(null);
  const [guardTargetPath, setGuardTargetPath] = useState(null);

  const activeRole = currentUser?.role || 'student';

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'student':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'coordinator':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'admin':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Role hierarchy rules
  const isStudentVisible = true;
  const isCoordinatorVisible = activeRole === 'coordinator' || activeRole === 'admin';
  const isAdminVisible = activeRole === 'admin';

  const avatarSeed = currentUser?.id || 'smart-user';
  const username = currentUser?.username || currentUser?.email?.split('@')[0] || 'user';
  const fullName = currentUser?.full_name || currentUser?.name || 'Smart User';

  const handleLogout = async () => {
    await signOutFromSupabase();
    navigate('/login');
  };

  /**
   * Guarded navigation handler.
   * Student tab -> no guard needed (all roles can access).
   * Coordinator tab -> mandatory PIN/password verification.
   * Admin tab -> mandatory PIN/password verification.
   */
  const handleGuardedNavigation = useCallback((targetPath, requiredRole) => {
    // Student route needs no guard
    if (requiredRole === 'student') {
      navigate(targetPath);
      return;
    }

    // If already on the target path, still enforce guard (re-verify)
    setGuardTargetRole(requiredRole);
    setGuardTargetPath(targetPath);
    setGuardOpen(true);
  }, [navigate]);

  const handleGuardSuccess = useCallback(() => {
    setGuardOpen(false);
    if (guardTargetPath) {
      navigate(guardTargetPath);
    }
  }, [guardTargetPath, navigate]);

  /**
   * Role switcher dropdown handler — also requires PIN guard.
   */
  const handleRoleSwitchAttempt = useCallback((newRole) => {
    if (newRole === 'student') {
      switchRole(newRole);
      navigate('/student');
      return;
    }

    // For coordinator and admin roles, require guard
    setGuardTargetRole(newRole);
    setGuardTargetPath(newRole === 'admin' ? '/admin' : '/coordinator');
    setGuardOpen(true);
  }, [switchRole, navigate]);

  // Override success to also handle role switcher
  const handleGuardSuccessWithRoleSwitch = useCallback(() => {
    setGuardOpen(false);
    if (guardTargetRole && guardTargetRole !== activeRole) {
      switchRole(guardTargetRole);
    }
    if (guardTargetPath) {
      navigate(guardTargetPath);
    }
  }, [guardTargetRole, guardTargetPath, activeRole, switchRole, navigate]);

  return (
    <>
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 px-4 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Institutional Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs text-white group-hover:bg-indigo-700 transition-colors">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 tracking-tight">
                Smart Coordinator
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                V1.0 Live
              </span>
            </div>
          </Link>

          {/* Pill-Shaped Segmented Navigation Control */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200 shadow-2xs">
            {/* Student Pass */}
            {isStudentVisible && (
              <button
                onClick={() => handleGuardedNavigation('/student', 'student')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  location.pathname.startsWith('/student') || location.pathname === '/'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Student Pass
              </button>
            )}

            {/* Coordinator Dashboard — GUARDED */}
            {isCoordinatorVisible && (
              <>
                <button
                  onClick={() => handleGuardedNavigation('/coordinator', 'coordinator')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    location.pathname === '/coordinator'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Coordinator Dashboard
                </button>
                <button
                  onClick={() => handleGuardedNavigation('/scanner', 'coordinator')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    location.pathname.startsWith('/scanner')
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                  QR Scanner
                </button>
              </>
            )}

            {/* Admin Panel — GUARDED */}
            {isAdminVisible && (
              <button
                onClick={() => handleGuardedNavigation('/admin', 'admin')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Panel
              </button>
            )}
          </div>

          {/* User Profile Pill & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Role Switcher dropdown for testing/demo */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              <span className="text-[10px] text-slate-500 font-medium">Role:</span>
              <select
                value={activeRole}
                onChange={(e) => handleRoleSwitchAttempt(e.target.value)}
                className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="student">Student</option>
                <option value="coordinator">Coordinator</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* User Profile Pill Card */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full p-1 pr-3 shadow-2xs">
              <img
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`}
                alt="Avatar"
                className="w-7 h-7 rounded-full bg-white border border-slate-200 p-0.5"
              />
              <div className="hidden lg:block text-left pr-1">
                <div className="text-xs font-semibold text-slate-900 leading-none">{fullName}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">@{username}</div>
              </div>

              <span
                className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(activeRole)}`}
              >
                {activeRole}
              </span>

              {/* User Settings Trigger */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Account Settings"
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Styled Logout Button */}
            <button
              onClick={handleLogout}
              title="Log Out of Account"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* User Profile & Account Settings Modal */}
      <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Mandatory Role Switch Security Guard Modal */}
      <RoleSwitchGuardModal
        isOpen={guardOpen}
        onClose={() => setGuardOpen(false)}
        targetRole={guardTargetRole}
        userEmail={currentUser?.email || ''}
        userId={currentUser?.id || ''}
        onSuccess={handleGuardSuccessWithRoleSwitch}
      />
    </>
  );
}
