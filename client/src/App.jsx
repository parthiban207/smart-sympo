// agent-notes: { ctx: "Main App container with PASSWORD_RECOVERY global listener, collapsible left sidebar shell, dark mode support, and protected routes", deps: ["src/components/Sidebar.jsx", "src/components/Navbar.jsx", "src/components/LiveAlertBanner.jsx", "src/components/Chatbot.jsx", "src/components/ProtectedRoute.tsx", "src/context/AppContext.jsx"], state: "active", last: "antigravity@2026-08-31" }

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { supabase, isMockMode } from './supabaseClient';
import Sidebar from './components/Sidebar';
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

  if (hash.includes('type=recovery') || search.includes('type=recovery')) {
    return <Navigate to={`/reset-password${hash}${search}`} replace />;
  }

  const { isAuthenticated, currentUser } = useApp();
  const isLoggedIn = isAuthenticated || Boolean(currentUser?.id);
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleDestination(currentUser?.role)} replace />;
}

function AuthSyncListener() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isMockMode) return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      if (location.pathname !== '/reset-password') {
        navigate(`/reset-password${hash}${search}`, { replace: true });
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
      } else if (event === 'SIGNED_OUT') {
        const publicPaths = ['/login', '/login/student', '/login/staff', '/login/admin', '/admin/login', '/signup', '/reset-password'];
        const currentPath = window.location.pathname;

        if (!publicPaths.includes(currentPath) && !window.location.hash.includes('type=recovery')) {
          navigate('/login', { replace: true });
        }
      }
    });

    const handleStorageChange = (e) => {
      if (e.key === 'smart_sympo_user' && !e.newValue) {
        const publicPaths = ['/login', '/login/student', '/login/staff', '/login/admin', '/admin/login', '/signup', '/reset-password'];
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

// App Shell Container for Authenticated Routes
function AppShell() {
  const { isAuthenticated, currentUser } = useApp();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicPaths = ['/login', '/login/student', '/login/staff', '/login/admin', '/admin/login', '/signup', '/reset-password'];
  const isPublicPage = publicPaths.includes(location.pathname);
  const isLoggedIn = (isAuthenticated || Boolean(currentUser?.id)) && !isPublicPage;

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#121417] text-[#1E293B] dark:text-[#F1F5F9] flex flex-col font-sans transition-colors duration-200">
      {isLoggedIn && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
        />
      )}

      <div
        className={`flex-1 flex flex-col transition-all duration-200 ${
          isLoggedIn ? (isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64') : ''
        }`}
      >
        {isLoggedIn && <Navbar onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />}
        <LiveAlertBanner />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<RootRouteRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/student" element={<StudentLoginPage />} />
            <Route path="/login/staff" element={<StaffLoginPage defaultRole="coordinator" />} />
            <Route path="/login/admin" element={<StaffLoginPage defaultRole="admin" />} />
            <Route path="/admin/login" element={<StaffLoginPage defaultRole="admin" />} />
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
      </div>

      <Chatbot />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AuthSyncListener />
        <AppShell />
      </BrowserRouter>
    </AppProvider>
  );
}
