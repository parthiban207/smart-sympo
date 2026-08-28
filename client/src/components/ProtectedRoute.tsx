// agent-notes: { ctx: "Strict role authority and session verification route protection wrapper with no flash of content", deps: ["src/context/AppContext.jsx", "src/supabaseClient.js", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-08-26" }

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase, isMockMode } from '../supabaseClient';
import { UserRole } from '../hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { currentUser, isAuthenticated } = useApp();
  const location = useLocation();

  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const allowedRolesKey = (allowedRoles || []).slice().sort().join(',');

  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      try {
        const savedUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('smart_sympo_user') : null;
        let savedUser = null;
        try {
          if (savedUserStr) savedUser = JSON.parse(savedUserStr);
        } catch (_) {}

        let hasActiveSession = isAuthenticated || Boolean(currentUser?.id) || Boolean(savedUser?.id);

        if (!isMockMode) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              hasActiveSession = true;
            }
          } catch (_) {}
        }

        if (!hasActiveSession) {
          if (isMounted) {
            setIsAuthorized(false);
            setIsChecking(false);
          }
          return;
        }

        const savedRole = (typeof localStorage !== 'undefined'
          ? (localStorage.getItem('smart_sympo_active_role') as UserRole | null)
          : null);

        const effectiveRole: UserRole =
          (currentUser?.role as UserRole) || (savedUser?.role as UserRole) || savedRole || 'student';

        const roleAllowed = allowedRoles.includes(effectiveRole);
        const authorized = hasActiveSession && roleAllowed;

        if (isMounted) {
          setIsAuthorized((prev) => (prev !== authorized ? authorized : prev));
          setIsChecking(false);
        }
      } catch (err) {
        console.warn('[ProtectedRoute Verification Catch]:', err);
        if (isMounted) {
          setIsAuthorized(false);
          setIsChecking(false);
        }
      }
    };

    verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [allowedRolesKey, currentUser?.id, currentUser?.role, isAuthenticated, location.pathname]);

  // While verifying session, render sleek loading indicator to prevent content flash
  if (isChecking) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center bg-slate-50 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shadow-xs">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-slate-500">Verifying session permissions...</p>
      </div>
    );
  }

  // If no valid session or role mismatch, immediately redirect to /login
  if (!isAuthorized) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
