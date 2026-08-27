import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}

export function Card({ className, children, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-900/5 transition-all duration-300',
        onClick && 'cursor-pointer hover:-translate-y-1 hover:shadow-card-hover hover:border-zinc-300',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h3 className={cn('text-lg font-semibold tracking-tight text-zinc-900', className)}>{children}</h3>;
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn(className)}>{children}</div>;
}
