import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'orange';
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const variantStyles = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  default: 'bg-slate-100 text-slate-600 border-slate-200',
};

const dotStyles = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  orange: 'bg-orange-500',
  default: 'bg-slate-400',
};

export function Badge({ variant = 'default', dot, children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
      variantStyles[variant],
      className
    )}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[variant])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    PRESENT: { variant: 'success', label: 'Present' },
    FULL_DAY: { variant: 'success', label: 'Full Day' },
    HALF_DAY: { variant: 'warning', label: 'Half Day' },
    LEAVE: { variant: 'info', label: 'Leave' },
    PAID_LEAVE: { variant: 'info', label: 'Paid Leave' },
    UNPAID_LEAVE: { variant: 'info', label: 'Unpaid Leave' },
    SICK_LEAVE: { variant: 'info', label: 'Sick Leave' },
    ABSENT: { variant: 'danger', label: 'Absent' },
    WEEKLY_OFF: { variant: 'default', label: 'Weekly Off' },
    HOLIDAY: { variant: 'default', label: 'Holiday' },
  };

  const c = config[status] || { variant: 'default' as const, label: status };
  return <Badge variant={c.variant} dot>{c.label}</Badge>;
}
