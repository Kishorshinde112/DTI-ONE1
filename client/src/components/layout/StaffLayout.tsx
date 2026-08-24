import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Home, Clock, CalendarDays, FileText, User, LogOut, Menu, X, Zap
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';

const staffNav = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/attendance', icon: Clock, label: 'Attendance' },
  { to: '/leave', icon: CalendarDays, label: 'Leave' },
  { to: '/attendance/history', icon: FileText, label: 'History' },
  { to: '/profile', icon: User, label: 'Profile' },
];

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 pt-6 pb-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/30">
        <Zap className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tight text-white leading-none">DTI Pulse</h1>
        <p className="text-[11px] text-slate-400 mt-1">Attendance Management</p>
      </div>
    </div>
  );
}

function UserCard({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="mx-4 mb-2 flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
      <Avatar name={name} className="h-9 w-9 text-xs" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-slate-400 truncate">{subtitle}</p>
      </div>
    </div>
  );
}

export function StaffLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const sidebar = (
    <div className="flex h-full flex-col bg-[#101a33] text-white">
      <Brand />
      <UserCard name={fullName} subtitle={user?.employeeId || ''} />
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {staffNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md shadow-primary/25'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => { logout(); }}
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-[#101a33] text-white shadow-md lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-white/10 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold tracking-tight">DTI Pulse</span>
            </div>
          </div>
          <button onClick={() => navigate('/profile')} aria-label="Profile" className="rounded-full p-1 hover:bg-white/10 transition-colors">
            <Avatar name={fullName} className="h-8 w-8 text-[10px]" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 shadow-2xl animate-slide-up sm:animate-none overflow-y-auto">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-4 z-10 rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        {sidebar}
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pb-20 lg:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
          <div className="page-enter">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Bottom Nav — mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 lg:hidden safe-area-pb shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-around px-2 py-1.5">
          {staffNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-xs transition-colors min-w-[56px]',
                  isActive ? 'text-primary font-semibold' : 'text-slate-500')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('rounded-full px-2 py-0.5 transition-colors', isActive && 'bg-primary-soft')}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
