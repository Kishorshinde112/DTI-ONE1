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
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-500/20">
        <Zap className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tight text-white leading-none">DTI Pulse</h1>
        <p className="text-[11px] text-zinc-400 mt-1">Attendance OS</p>
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

export function StaffLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const sidebar = (
    <div className="flex h-full flex-col bg-zinc-950 text-white">
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
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => { logout(); }}
          className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-zinc-950 text-white shadow-md lg:hidden w-full">
        <div className="flex items-center justify-between px-4 py-3 w-full">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-white/10 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
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
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 sm:animate-none overflow-y-auto bg-zinc-950">
            <button
              onClick={() => setMobileOpen(false)}
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
      <main className="flex-1 min-h-screen relative w-full lg:w-auto pb-20 lg:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8 w-full">
          <div className="page-enter">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Bottom Nav — mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-zinc-200 lg:hidden pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-around px-2 py-1.5">
          {staffNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-xs transition-colors min-w-[56px]',
                  isActive ? 'text-indigo-600 font-semibold' : 'text-zinc-500')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('rounded-full px-2 py-0.5 transition-colors', isActive && 'bg-indigo-50')}>
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
