import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, Users, Clock, CalendarDays, MapPin, Settings,
  FileText, Shield, LogOut, Menu, X, Timer, Zap
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';

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

function Brand({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex items-center gap-3 px-5 pt-6 pb-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-500/20">
        <Zap className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tight text-white leading-none">DTI Pulse</h1>
        <p className="text-[11px] text-zinc-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function UserCard({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="mx-4 mb-2 flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
      <Avatar name={name} className="h-9 w-9 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-zinc-400 truncate">{subtitle}</p>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
      {adminNav.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={cn('h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-zinc-500 group-hover:text-white')} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const sidebar = (
    <div className="flex h-full flex-col bg-zinc-950 text-white">
      <Brand subtitle="Admin Panel" />
      <UserCard name={fullName} subtitle="Administrator" />
      <NavList onNavigate={() => setSidebarOpen(false)} />
      <div className="px-3 py-4 border-t border-white/10">
        <button onClick={logout} className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-zinc-950 text-white shadow-md lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-white/10">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold tracking-tight">DTI Pulse</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} aria-label="Profile" className="rounded-full p-1 hover:bg-white/10">
            <Avatar name={fullName} className="h-8 w-8 text-[10px]" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 shadow-2xl animate-slide-up sm:animate-none overflow-y-auto bg-zinc-950">
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-4 z-10 rounded-lg p-1.5 text-zinc-300 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 min-h-screen border-r border-zinc-800">
        <div className="fixed inset-y-0 w-64">
          {sidebar}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen relative w-full lg:w-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8 w-full">
          <div className="page-enter">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
