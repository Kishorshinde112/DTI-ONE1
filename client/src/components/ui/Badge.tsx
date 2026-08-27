import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'orange' | 'purple';
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const variantStyles = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 ring-emerald-600/10',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/60 ring-amber-600/10',
  danger: 'bg-red-50 text-red-700 border-red-200/60 ring-red-600/10',
  info: 'bg-indigo-50 text-indigo-700 border-indigo-200/60 ring-indigo-600/10',
  purple: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/60 ring-fuchsia-600/10',
  orange: 'bg-orange-50 text-orange-700 border-orange-200/60 ring-orange-600/10',
  default: 'bg-zinc-100 text-zinc-600 border-zinc-200/60 ring-zinc-500/10',
};

const dotStyles = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-indigo-500',
  purple: 'bg-fuchsia-500',
  orange: 'bg-orange-500',
  default: 'bg-zinc-400',
};

export function Badge({ variant = 'default', dot, children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ring-1 ring-inset shadow-sm',
      variantStyles[variant],
      className
    )}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shadow-sm', dotStyles[variant])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    PRESENT: { variant: 'success', label: 'Present' },
    FULL_DAY: { variant: 'success', label: 'Full Day' },
    HALF_DAY: { variant: 'warning', label: 'Half Day' },
    LEAVE: { variant: 'purple', label: 'Leave' },
    PAID_LEAVE: { variant: 'purple', label: 'Paid Leave' },
    UNPAID_LEAVE: { variant: 'purple', label: 'Unpaid Leave' },
    SICK_LEAVE: { variant: 'purple', label: 'Sick Leave' },
    ABSENT: { variant: 'danger', label: 'Absent' },
    WEEKLY_OFF: { variant: 'default', label: 'Weekly Off' },
    HOLIDAY: { variant: 'default', label: 'Holiday' },
  };

  const c = config[status] || { variant: 'default' as const, label: status };
  return <Badge variant={c.variant} dot>{c.label}</Badge>;
}
