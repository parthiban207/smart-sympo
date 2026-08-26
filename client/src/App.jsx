// agent-notes: { ctx: "Main App container with PASSWORD_RECOVERY global listener, URL recovery hash interception, and protected routes", deps: ["src/components/Navbar.jsx", "src/components/LiveAlertBanner.jsx", "src/components/Chatbot.jsx", "src/components/ProtectedRoute.tsx", "src/pages/LoginPage.jsx", "src/pages/StudentLoginPage.jsx", "src/pages/StaffLoginPage.jsx", "src/pages/ResetPasswordPage.tsx", "src/context/AppContext.jsx", "src/supabaseClient.ts"], state: "active", last: "antigravity@2026-08-26" }

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { supabase, isMockMode } from './supabaseClient';
import Navbar from './components/Navbar';
import LiveAlertBanner from './components/LiveAlertBanner';
import Chatbot from './components/Chatbot';
import ProtectedRoute from './components/ProtectedRoute';
import StudentDashboard from './pages/StudentDashboard';
import CoordinatorConsole from './pages/CoordinatorConsole';
import CoordinatorScanner from './pages/CoordinatorScanner';
import AdminAnalytics from './pages/AdminAnalytics';
import LoginPage from './pages/LoginPage';
import StudentLoginPage from './pages/StudentLoginPage';
import StaffLoginPage from './pages/StaffLoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function getRoleDestination(role) {
  if (role === 'admin') return '/admin';
  if (role === 'coordinator') return '/coordinator';
  return '/student';
}

function RootRouteRedirect() {
  const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
  const search = typeof window !== 'undefined' ? window.location.search || '' : '';

  // If user arrives via password reset recovery link, navigate to /reset-password
  if (hash.includes('type=recovery') || search.includes('type=recovery')) {
    return <Navigate to={`/reset-password${hash}${search}`} replace />;
  }

  const { isAuthenticated, currentUser } = useApp();
  const isLoggedIn = isAuthenticated || Boolean(currentUser?.id);
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleDestination(currentUser?.role)} replace />;
}

// Global Auth State & Password Recovery Interceptor Listener
function AuthSyncListener() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 0. Global Session Cleanup on Mount (clear stale localStorage auth keys on fresh login entry)
    try {
      const isAuthRoute = ['/login', '/login/student', '/login/staff', '/signup'].includes(location.pathname);
      const hasValidSbToken = Object.keys(localStorage).some(
        (k) => (k.startsWith('sb-') && k.endsWith('-auth-token')) || k === 'sb-access-token'
      );

      if (!hasValidSbToken && isAuthRoute) {
        localStorage.removeItem('smart_sympo_user');
        localStorage.removeItem('smart_sympo_active_role');
      }
    } catch (e) {
      console.warn('[Session Cleanup Warning]:', e);
    }

    if (isMockMode) return;

    // 1. Intercept password recovery tokens in URL hash or search params on initial load
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      if (location.pathname !== '/reset-password') {
        navigate(`/reset-password${hash}${search}`, { replace: true });
      }
    }

    // 2. Global Supabase onAuthStateChange for PASSWORD_RECOVERY and SIGNED_OUT
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Supabase Auth Event]:', event, Boolean(session));

      if (event === 'PASSWORD_RECOVERY') {
        // Force navigate user directly to the reset-password route
        navigate('/reset-password', { replace: true });
      } else if (event === 'SIGNED_OUT') {
        const publicPaths = ['/login', '/login/student', '/login/staff', '/signup', '/reset-password'];
        const currentPath = window.location.pathname;

        if (!publicPaths.includes(currentPath) && !window.location.hash.includes('type=recovery')) {
          console.warn('[Session Expired / Signed Out]: Redirecting to /login...');
          navigate('/login', { replace: true });
        }
      }
    });

    // 3. Storage listener across tabs
    const handleStorageChange = (e) => {
      if (e.key === 'smart_sympo_user' && !e.newValue) {
        const publicPaths = ['/login', '/login/student', '/login/staff', '/signup', '/reset-password'];
        const currentPath = window.location.pathname;
        if (!publicPaths.includes(currentPath) && !window.location.hash.includes('type=recovery')) {
          navigate('/login', { replace: true });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate, location]);

  return null;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AuthSyncListener />
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
          <Navbar />
          <LiveAlertBanner />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<RootRouteRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/student" element={<StudentLoginPage />} />
              <Route path="/login/staff" element={<StaffLoginPage />} />
              <Route path="/signup" element={<StudentLoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['student', 'coordinator', 'admin']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coordinator"
                element={
                  <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                    <CoordinatorConsole />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scanner"
                element={
                  <ProtectedRoute allowedRoles={['coordinator', 'admin']}>
                    <CoordinatorScanner />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/student" replace />} />
            </Routes>
          </main>
          <Chatbot />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
