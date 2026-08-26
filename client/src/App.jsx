// agent-notes: { ctx: "Main App container with router navigation, protected routes, and cross-tab auth state synchronization", deps: ["src/components/Navbar.jsx", "src/components/LiveAlertBanner.jsx", "src/components/Chatbot.jsx", "src/components/ProtectedRoute.tsx", "src/pages/LoginPage.jsx", "src/pages/StudentLoginPage.jsx", "src/pages/StaffLoginPage.jsx", "src/pages/ResetPasswordPage.tsx", "src/context/AppContext.jsx", "src/supabaseClient.ts"], state: "active", last: "antigravity@2026-08-26" }

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  const { isAuthenticated, currentUser } = useApp();
  const isLoggedIn = isAuthenticated || Boolean(currentUser?.id);
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleDestination(currentUser?.role)} replace />;
}

// Cross-Tab Session Synchronization & Global Auth Listener Component
function AuthSyncListener() {
  useEffect(() => {
    if (isMockMode) return;

    // 1. Supabase onAuthStateChange for cross-tab session tracking
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[App Cross-Tab Auth Event]:', event, Boolean(session));
      if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        const publicPaths = ['/login', '/login/student', '/login/staff', '/signup', '/reset-password'];
        const currentPath = window.location.pathname;

        if (!publicPaths.includes(currentPath)) {
          console.warn('[Cross-Tab Sync]: User logged out in another tab. Redirecting to /login...');
          window.location.href = '/login';
        }
      }
    });

    // 2. Storage event listener for explicit localStorage clearance across tabs
    const handleStorageChange = (e) => {
      if (e.key === 'smart_sympo_user' && !e.newValue) {
        const publicPaths = ['/login', '/login/student', '/login/staff', '/signup', '/reset-password'];
        const currentPath = window.location.pathname;

        if (!publicPaths.includes(currentPath)) {
          console.warn('[Cross-Tab Storage Sync]: User storage cleared. Redirecting to /login...');
          window.location.href = '/login';
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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
