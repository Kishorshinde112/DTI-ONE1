import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Home, Clock, CalendarDays, FileText, User, LogOut, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const staffNav = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/attendance', icon: Clock, label: 'Attendance' },
  { to: '/leave', icon: CalendarDays, label: 'Leave' },
  { to: '/attendance/history', icon: FileText, label: 'History' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function StaffLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header — mobile */}
      <header className="sticky top-0 z-40 bg-primary text-white shadow-md lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">DTI Pulse</h1>
          </div>
          <button onClick={logout} className="rounded-lg p-2 hover:bg-white/10 transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-primary text-white overflow-y-auto">
          <div className="px-6 py-5 border-b border-white/10">
            <h1 className="text-xl font-bold tracking-tight">DTI Pulse</h1>
            <p className="text-xs text-white/60 mt-1">Attendance Management</p>
          </div>
          <div className="px-4 py-4 border-b border-white/10">
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-white/60">{user?.employeeId}</p>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {staffNav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white')
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
      <main className="lg:pl-64 pb-20 lg:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-4 lg:px-8 lg:py-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom Nav — mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 lg:hidden safe-area-pb">
        <div className="flex items-center justify-around px-2 py-1">
          {staffNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg text-xs transition-colors min-w-[56px]',
                  isActive ? 'text-primary font-semibold' : 'text-gray-500')
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
