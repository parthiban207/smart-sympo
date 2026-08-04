// agent-notes: { ctx: "Protected route component enforcing strict role hierarchy with redirect toast alerts", deps: ["src/hooks/useUserRole.ts", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-07-31" }

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserRole, UserRole } from '../hooks/useUserRole';
import { useApp } from '../context/AppContext';
import { AlertCircle } from 'lucide-react';
import Auth from './Auth';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { role: fetchedRole, loading } = useUserRole();
  const { currentUser, isAuthenticated } = useApp();
  const location = useLocation();
  const [deniedToast, setDeniedToast] = useState<string | null>(null);

  const activeRole: UserRole = (currentUser?.role as UserRole) || fetchedRole || 'student';
  const isLoggedIn = isAuthenticated || Boolean(currentUser);

  useEffect(() => {
    if (isLoggedIn && !allowedRoles.includes(activeRole)) {
      if (activeRole === 'student') {
        setDeniedToast('Access Denied: Student permissions only.');
      } else if (activeRole === 'coordinator') {
        setDeniedToast('Access Denied: Admin permissions required.');
      }
    }
  }, [activeRole, allowedRoles, isLoggedIn, location.pathname]);

  if (loading && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-400 text-xs">
        Authenticating & verifying system role permissions...
      </div>
    );
  }

  // Redirect to mandatory login page if not logged in
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Redirect logic if role is not allowed
  if (!allowedRoles.includes(activeRole)) {
    if (activeRole === 'student') {
      return (
        <div className="relative">
          {deniedToast && (
            <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-rose-400 animate-bounce">
              <AlertCircle className="w-4 h-4 text-white" />
              <span>{deniedToast}</span>
            </div>
          )}
          <Navigate to="/student" replace />
        </div>
      );
    }

    if (activeRole === 'coordinator') {
      return (
        <div className="relative">
          {deniedToast && (
            <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 border border-rose-400 animate-bounce">
              <AlertCircle className="w-4 h-4 text-white" />
              <span>{deniedToast}</span>
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
