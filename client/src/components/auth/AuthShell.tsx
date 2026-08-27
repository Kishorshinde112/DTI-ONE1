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
    <div className="min-h-screen flex bg-pattern">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative overflow-hidden bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-indigo-950/20" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-[100px]" />
        <div className="absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-indigo-600/10 blur-[100px]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none text-white">DTI Pulse</h1>
              <p className="text-[11px] font-medium text-zinc-400 mt-1 uppercase tracking-wider">Attendance OS</p>
            </div>
          </div>

          <div className="space-y-8">
            <h2 className="text-4xl font-bold leading-tight tracking-tight text-white">
              Attendance, simplified for <span className="text-indigo-400">your team</span>.
            </h2>
            <ul className="space-y-6">
              {features.map(({ icon: Icon, label, desc }) => (
                <li key={label} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 shadow-sm ring-1 ring-inset ring-white/10">
                    <Icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-zinc-100">{label}</p>
                    <p className="text-sm text-zinc-400 mt-1 leading-snug">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-zinc-500 font-medium">Digital to Infinity &copy; {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-transparent relative">
        <div className="w-full max-w-md page-enter">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/30 ring-1 ring-white/10">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 leading-none">DTI Pulse</h1>
              <p className="text-[11px] font-medium text-zinc-500 mt-1.5 uppercase tracking-wider">Attendance OS</p>
            </div>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900">{title}</h2>
            {subtitle && <p className="text-base text-zinc-500 mt-2">{subtitle}</p>}
          </div>

          <div className="rounded-3xl border border-zinc-200/80 bg-white/70 backdrop-blur-xl p-8 sm:p-10 shadow-pop ring-1 ring-zinc-900/5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
