import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, Users, Clock, CalendarDays, MapPin, Settings,
  FileText, Shield, LogOut, Menu, X, Timer
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const adminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/employees', icon: Users, label: 'Employees' },
  { to: '/admin/attendance', icon: Clock, label: 'Attendance' },
  { to: '/admin/leaves', icon: CalendarDays, label: 'Leaves' },
  { to: '/admin/shifts', icon: Timer, label: 'Shifts' },
  { to: '/admin/locations', icon: MapPin, label: 'Locations' },
  { to: '/admin/reports', icon: FileText, label: 'Reports' },
  { to: '/admin/audit-logs', icon: Shield, label: 'Audit Logs' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-primary text-white shadow-md lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 hover:bg-white/10">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">DTI Pulse</h1>
          <button onClick={logout} className="rounded-lg p-2 hover:bg-white/10">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-primary text-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <h1 className="text-xl font-bold">DTI Pulse</h1>
              <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 py-4 border-b border-white/10">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-white/60">Administrator</p>
            </div>
            <nav className="px-3 py-4 space-y-1">
              {adminNav.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10')
                  }
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-white/10">
              <button onClick={logout} className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10">
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-primary text-white overflow-y-auto">
          <div className="px-6 py-5 border-b border-white/10">
            <h1 className="text-xl font-bold tracking-tight">DTI Pulse</h1>
            <p className="text-xs text-white/60 mt-1">Admin Panel</p>
          </div>
          <div className="px-4 py-4 border-b border-white/10">
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-white/60">Administrator</p>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {adminNav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10')
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-white/10">
            <button onClick={logout} className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
