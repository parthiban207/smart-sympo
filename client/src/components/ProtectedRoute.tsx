// agent-notes: { ctx: "Strict role authority route protection: Student -> Student only; Coordinator -> Coordinator & Scanner only; Admin -> Full access", deps: ["src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-13" }

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { UserRole } from '../hooks/useUserRole';
import { AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { currentUser, isAuthenticated } = useApp();
  const location = useLocation();
  const [deniedMsg, setDeniedMsg] = useState<string | null>(null);

  const savedRole = (typeof localStorage !== 'undefined' ? localStorage.getItem('smart_sympo_active_role') : null) as UserRole | null;
  const savedUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('smart_sympo_user') : null;
  const activeRole: UserRole = (currentUser?.role as UserRole) || savedRole || 'student';
  const isLoggedIn = isAuthenticated || Boolean(currentUser?.id) || Boolean(savedUserStr);

  useEffect(() => {
    if (isLoggedIn && !allowedRoles.includes(activeRole)) {
      if (activeRole === 'student') {
        setDeniedMsg('Access Denied: Student permissions only. Staff login required.');
      } else if (activeRole === 'coordinator') {
        setDeniedMsg('Access Denied: Coordinator cannot access Admin Governance Panel.');
      }
    }
  }, [activeRole, allowedRoles, isLoggedIn, location.pathname]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Strict role hierarchy enforcement
  if (!allowedRoles.includes(activeRole)) {
    if (activeRole === 'student') {
      return (
        <div className="relative">
          {deniedMsg && (
            <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-rose-400 animate-bounce">
              <AlertCircle className="w-4 h-4 text-white" />
              <span>{deniedMsg}</span>
            </div>
          )}
          <Navigate to="/student" replace />
        </div>
      );
    }

    if (activeRole === 'coordinator') {
      return (
        <div className="relative">
          {deniedMsg && (
            <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-rose-400 animate-bounce">
              <AlertCircle className="w-4 h-4 text-white" />
              <span>{deniedMsg}</span>
            </div>
          )}
          <Navigate to="/coordinator" replace />
        </div>
      );
    }

    return <Navigate to="/student" replace />;
  }

  return <>{children}</>;
}
