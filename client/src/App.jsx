// agent-notes: { ctx: "Main App container with router navigation, protected routes, and explicit /login and /signup pages", deps: ["src/components/Navbar.jsx", "src/components/LiveAlertBanner.jsx", "src/components/Chatbot.jsx", "src/components/ProtectedRoute.tsx", "src/pages/LoginPage.jsx", "src/pages/SignupPage.jsx", "src/context/AppContext.jsx"], state: "active", last: "antigravity@2026-07-31" }

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import LiveAlertBanner from './components/LiveAlertBanner';
import Chatbot from './components/Chatbot';
import ProtectedRoute from './components/ProtectedRoute';
import StudentDashboard from './pages/StudentDashboard';
import CoordinatorConsole from './pages/CoordinatorConsole';
import AdminAnalytics from './pages/AdminAnalytics';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

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

function AuthRouteGuard({ children }) {
  const { isAuthenticated, currentUser } = useApp();
  const isLoggedIn = isAuthenticated || Boolean(currentUser?.id);

  if (isLoggedIn) {
    return <Navigate to={getRoleDestination(currentUser?.role)} replace />;
  }

  return children;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
          <Navbar />
          <LiveAlertBanner />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<RootRouteRedirect />} />
              <Route
                path="/login"
                element={
                  <AuthRouteGuard>
                    <LoginPage />
                  </AuthRouteGuard>
                }
              />
              <Route
                path="/signup"
                element={
                  <AuthRouteGuard>
                    <SignupPage />
                  </AuthRouteGuard>
                }
              />
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
