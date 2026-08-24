import type { ReactNode } from 'react';
import { Zap, MapPin, CalendarCheck, ShieldCheck } from 'lucide-react';

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const features = [
  { icon: MapPin, label: 'GPS-verified check-ins', desc: 'Geofenced attendance tracking' },
  { icon: CalendarCheck, label: 'Shift & leave management', desc: 'Approvals and auto policies' },
  { icon: ShieldCheck, label: 'Admin controls', desc: 'Reports, audit logs and settings' },
];

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="min-h-screen flex bg-surface-muted">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative overflow-hidden bg-[#101a33] text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#101a33] via-[#16213e] to-[#1e2c4f]" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-accent-light/20 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/40">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">DTI Pulse</h1>
              <p className="text-xs text-slate-400 mt-1">Employee Attendance System</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold leading-tight">
              Attendance, simplified for <span className="text-primary-light">your team</span>.
            </h2>
            <ul className="space-y-5">
              {features.map(({ icon: Icon, label, desc }) => (
                <li key={label} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/10">
                    <Icon className="h-5 w-5 text-primary-light" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-500">Digital to Infinity &copy; {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md page-enter">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/30">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink leading-none">DTI Pulse</h1>
              <p className="text-xs text-slate-500 mt-1">Employee Attendance System</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-ink">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>

          <div className="rounded-2xl border border-border-soft bg-surface p-6 sm:p-8 shadow-card">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
