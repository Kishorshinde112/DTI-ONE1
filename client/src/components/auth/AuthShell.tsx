import type { ReactNode } from 'react';
import { Zap } from 'lucide-react';

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-8">
      <div className="w-full max-w-[440px] page-enter">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-md mb-4">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">DTI Pulse</h1>
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-2">{subtitle}</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
