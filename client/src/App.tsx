import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { StaffLayout } from '@/components/layout/StaffLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PwaInstallPrompt } from '@/components/common/PwaInstallPrompt';
import { lazy, Suspense, type ReactNode } from 'react';

// Auth pages
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import VerifyOtpPage from '@/pages/VerifyOtpPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';

// Staff pages
import StaffDashboard from '@/pages/StaffDashboard';
import AttendanceHistory from '@/pages/AttendanceHistory';
import LeavePage from '@/pages/LeavePage';
import ProfilePage from '@/pages/ProfilePage';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminEmployees from '@/pages/admin/AdminEmployees';
import AdminEmployeeDetail from '@/pages/admin/AdminEmployeeDetail';
import AdminAttendance from '@/pages/admin/AdminAttendance';
import AdminShifts from '@/pages/admin/AdminShifts';
import AdminLocations from '@/pages/admin/AdminLocations';
import AdminLeaves from '@/pages/admin/AdminLeaves';
import AdminReports from '@/pages/admin/AdminReports';
import AdminAuditLogs from '@/pages/admin/AdminAuditLogs';
import AdminSettings from '@/pages/admin/AdminSettings';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="h-10 w-10 mx-auto mb-3 border-4 border-primary/15 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRole }: { children: ReactNode; allowedRole?: 'admin' | 'staff' }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

            {/* Staff */}
            <Route element={<ProtectedRoute><StaffLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<StaffDashboard />} />
              <Route path="/attendance" element={<StaffDashboard />} />
              <Route path="/attendance/history" element={<AttendanceHistory />} />
              <Route path="/leave" element={<LeavePage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute allowedRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/employees" element={<AdminEmployees />} />
              <Route path="/admin/employees/:id" element={<AdminEmployeeDetail />} />
              <Route path="/admin/attendance" element={<AdminAttendance />} />
              <Route path="/admin/leaves" element={<AdminLeaves />} />
              <Route path="/admin/shifts" element={<AdminShifts />} />
              <Route path="/admin/locations" element={<AdminLocations />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* Default */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>

          <PwaInstallPrompt />

          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '12px', background: '#101a33', color: '#fff', fontSize: '14px' },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
